import { prisma } from "./db.ts";
import { generateHoldToken, generateOrderId, generateTicketCode } from "./qr.ts";
import { dispatchSeatsReleased } from "./events/seat-events.ts";
import { sendOrderExpiredWhatsApp } from "./wa.ts";

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 menit

export class SeatsTakenError extends Error {
  readonly code = "SEATS_TAKEN" as const;
  readonly takenLabels: string[];

  constructor(takenLabels: string[], message?: string) {
    super(
      message ??
        `Kursi ${takenLabels.join(", ")} baru saja diambil pengunjung lain. Silakan pilih kursi lain.`
    );
    this.name = "SeatsTakenError";
    this.takenLabels = takenLabels;
  }
}

export class OrderHoldInvalidError extends Error {
  readonly code: "ORDER_NOT_FOUND" | "ORDER_EXPIRED" | "ORDER_FAILED" | "HOLD_TAKEN";

  constructor(
    code: "ORDER_NOT_FOUND" | "ORDER_EXPIRED" | "ORDER_FAILED" | "HOLD_TAKEN",
    message: string
  ) {
    super(message);
    this.name = "OrderHoldInvalidError";
    this.code = code;
  }
}

export interface HoldSeatsInput {
  eventId: string;
  seatLabels: string[];
  buyerName: string;
  buyerPhone: string;
  holdDurationMs?: number;
}

export interface HoldSeatsResult {
  orderId: string;
  holdToken: string;
  holdExpiresAt: Date;
  totalAmount: number;
  seats: { id: string; label: string; zoneName: string; price: number }[];
}

/**
 * SATU-SATUNYA fungsi untuk menahan kursi (AVAILABLE / expired HELD -> HELD)
 * dan membuat Order PENDING secara atomik dalam satu transaksi database.
 *
 * Menggunakan satu statement SQL `UPDATE ... FROM (SELECT ... FOR UPDATE)`
 * dengan urutan `id` deterministik sehingga bebas race condition dan bebas deadlock.
 */
export async function holdSeatsAndCreateOrder(
  input: HoldSeatsInput
): Promise<HoldSeatsResult> {
  const uniqueLabels = Array.from(new Set(input.seatLabels.map((l) => l.trim()))).filter(Boolean);
  if (uniqueLabels.length === 0) {
    throw new Error("Pilih minimal 1 kursi");
  }

  // Ambil harga kursi dari database di server (jangan pernah percaya harga dari klien)
  const dbSeats = await prisma.seat.findMany({
    where: {
      eventId: input.eventId,
      label: { in: uniqueLabels },
    },
    include: {
      zone: true,
    },
  });

  if (dbSeats.length !== uniqueLabels.length) {
    const found = new Set(dbSeats.map((s) => s.label));
    const missing = uniqueLabels.filter((l) => !found.has(l));
    throw new Error(`Kursi tidak ditemukan: ${missing.join(", ")}`);
  }

  for (const s of dbSeats) {
    if (!s.zone) {
      throw new Error(`Kursi ${s.label} belum memiliki kategori zona`);
    }
  }

  const totalAmount = dbSeats.reduce((sum, s) => sum + (s.zone?.price ?? 0), 0);
  const orderId = generateOrderId();
  const holdToken = generateHoldToken();
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + (input.holdDurationMs ?? HOLD_DURATION_MS));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: orderId,
          eventId: input.eventId,
          buyerName: input.buyerName,
          buyerPhone: input.buyerPhone,
          status: "PENDING",
          totalAmount,
          holdToken,
          holdExpiresAt,
        },
      });

      // Satu statement atomik untuk mengunci dan memperbarui seluruh kursi yang diminta
      const updated = await tx.$queryRaw<{ id: string; label: string }[]>`
        WITH target AS (
          SELECT "id"
          FROM "Seat"
          WHERE "eventId" = ${input.eventId}
            AND "label" = ANY(${uniqueLabels}::text[])
            AND "zoneId" IS NOT NULL
            AND (
              "status" = 'AVAILABLE'::"SeatStatus"
              OR ("status" = 'HELD'::"SeatStatus" AND "heldUntil" < ${now})
            )
          ORDER BY "id"
          FOR UPDATE
        )
        UPDATE "Seat" s
        SET "status" = 'HELD'::"SeatStatus",
            "heldUntil" = ${holdExpiresAt},
            "holdToken" = ${holdToken},
            "orderId" = ${orderId}
        FROM target
        WHERE s."id" = target."id"
        RETURNING s."id", s."label"
      `;

      if (updated.length !== uniqueLabels.length) {
        const succeeded = new Set(updated.map((r) => r.label));
        const failed = uniqueLabels.filter((l) => !succeeded.has(l));
        throw new SeatsTakenError(failed);
      }

      await tx.event.update({
        where: { id: input.eventId },
        data: { layoutLocked: true },
      });
    });
  } catch (err) {
    if (err instanceof SeatsTakenError) {
      throw err;
    }
    throw err;
  }

  return {
    orderId,
    holdToken,
    holdExpiresAt,
    totalAmount,
    seats: dbSeats.map((s) => ({
      id: s.id,
      label: s.label,
      zoneName: s.zone!.name,
      price: s.zone!.price,
    })),
  };
}

/**
 * Lepas hold kursi untuk suatu pesanan (saat dibatalkan, gagal bayar, atau kedaluwarsa).
 */
export async function releaseOrderHold(
  orderId: string,
  nextOrderStatus: "FAILED" | "EXPIRED" = "FAILED"
): Promise<{ releasedSeats: number; status: "FAILED" | "EXPIRED" | "PAID" }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; eventId: string; status: string; holdToken: string }[]>`
      SELECT "id", "eventId", "status"::text AS "status", "holdToken"
      FROM "Order"
      WHERE "id" = ${orderId}
      FOR UPDATE
    `;
    const order = rows[0];
    if (!order) {
      throw new OrderHoldInvalidError("ORDER_NOT_FOUND", "Pesanan tidak ditemukan");
    }
    if (order.status === "PAID") {
      return { releasedSeats: 0, status: "PAID" as const };
    }

    const releasedSeats = await tx.$queryRaw<{ id: string; label: string; zoneId: string | null }[]>`
      UPDATE "Seat"
      SET "status" = 'AVAILABLE'::"SeatStatus",
          "heldUntil" = NULL,
          "holdToken" = NULL,
          "orderId" = NULL
      WHERE "holdToken" = ${order.holdToken}
        AND "status" = 'HELD'::"SeatStatus"
      RETURNING "id", "label", "zoneId"
    `;

    const finalStatus = order.status === "EXPIRED" ? "EXPIRED" : nextOrderStatus;
    const now = new Date();
    if (order.status === "PENDING") {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: finalStatus,
          ...(finalStatus === "EXPIRED" ? { expiredAt: now } : {}),
        },
      });
    }

    if (releasedSeats.length > 0) {
      await dispatchSeatsReleased({
        eventId: order.eventId,
        orderId,
        reason: finalStatus === "EXPIRED" ? "EXPIRED" : "CANCELLED",
        releasedSeats,
        timestamp: now,
      });
    }

    return { releasedSeats: releasedSeats.length, status: finalStatus };
  });
}

/**
 * Konfirmasi pembayaran pesanan: ubah kursi HELD -> SOLD secara atomik dengan syarat
 * `holdToken` masih milik pesanan ini, buat Ticket per kursi, dan kunci layout event.
 * Aman dipanggil dua kali (idempotent bila Order sudah PAID).
 */
export async function confirmOrderSold(orderId: string): Promise<{
  alreadyPaid: boolean;
  orderId: string;
  tickets: { id: string; code: string; seatId: string; seatLabel: string }[];
}> {
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      {
        id: string;
        eventId: string;
        status: string;
        totalAmount: number;
        holdToken: string;
        holdExpiresAt: Date;
      }[]
    >`
      SELECT "id", "eventId", "status"::text AS "status", "totalAmount", "holdToken", "holdExpiresAt"
      FROM "Order"
      WHERE "id" = ${orderId}
      FOR UPDATE
    `;
    const order = rows[0];
    if (!order) {
      throw new OrderHoldInvalidError("ORDER_NOT_FOUND", "Pesanan tidak ditemukan");
    }

    // Idempotent bila tombol bayar ditekan dua kali
    if (order.status === "PAID") {
      const existingTickets = await tx.ticket.findMany({
        where: { orderId },
        include: { seat: { select: { label: true } } },
      });
      return {
        status: "PAID" as const,
        alreadyPaid: true,
        orderId,
        tickets: existingTickets.map((t) => ({
          id: t.id,
          code: t.code,
          seatId: t.seatId,
          seatLabel: t.seat.label,
        })),
      };
    }

    if (order.status === "FAILED") {
      throw new OrderHoldInvalidError(
        "ORDER_FAILED",
        "Pesanan ini sudah dibatalkan atau gagal dibayar."
      );
    }
    if (order.status === "EXPIRED") {
      throw new OrderHoldInvalidError(
        "ORDER_EXPIRED",
        "Waktu tahan kursi untuk pesanan ini telah habis."
      );
    }

    const now = new Date();

    // Kunci semua kursi yang masih memegang holdToken pesanan ini
    const heldSeats = await tx.$queryRaw<
      { id: string; label: string; price: number }[]
    >`
      SELECT s."id", s."label", COALESCE(z."price", 0) AS "price"
      FROM "Seat" s
      LEFT JOIN "Zone" z ON z."id" = s."zoneId"
      WHERE s."eventId" = ${order.eventId}
        AND s."holdToken" = ${order.holdToken}
        AND s."status" = 'HELD'::"SeatStatus"
      ORDER BY s."id"
      FOR UPDATE OF s
    `;

    const heldSum = heldSeats.reduce((acc, s) => acc + Number(s.price), 0);

    // 1. Jika kursi sudah diambil orang lain setelah hold kedaluwarsa (token berganti) -> HOLD_TAKEN
    if (heldSeats.length === 0 || heldSum !== order.totalAmount) {
      const releasedSeats = await tx.$queryRaw<{ id: string; label: string; zoneId: string | null }[]>`
        UPDATE "Seat"
        SET "status" = 'AVAILABLE'::"SeatStatus",
            "heldUntil" = NULL,
            "holdToken" = NULL,
            "orderId" = NULL
        WHERE "holdToken" = ${order.holdToken}
          AND "status" = 'HELD'::"SeatStatus"
        RETURNING "id", "label", "zoneId"
      `;
      await tx.order.update({
        where: { id: orderId },
        data: { status: "EXPIRED", expiredAt: now },
      });

      return {
        status: "HOLD_TAKEN" as const,
        orderId,
        eventId: order.eventId,
        releasedSeats,
      };
    }

    // 2. Jika kursi belum diambil orang lain tapi waktu sudah kedaluwarsa -> ORDER_EXPIRED
    if (order.holdExpiresAt <= now) {
      const releasedSeats = await tx.$queryRaw<{ id: string; label: string; zoneId: string | null }[]>`
        UPDATE "Seat"
        SET "status" = 'AVAILABLE'::"SeatStatus",
            "heldUntil" = NULL,
            "holdToken" = NULL,
            "orderId" = NULL
        WHERE "holdToken" = ${order.holdToken}
          AND "status" = 'HELD'::"SeatStatus"
        RETURNING "id", "label", "zoneId"
      `;
      await tx.order.update({
        where: { id: orderId },
        data: { status: "EXPIRED", expiredAt: now },
      });

      return {
        status: "EXPIRED" as const,
        orderId,
        eventId: order.eventId,
        releasedSeats,
      };
    }

    // Ubah semua kursi menjadi SOLD dalam satu statement atomik
    const soldRows = await tx.$queryRaw<{ id: string; label: string }[]>`
      UPDATE "Seat"
      SET "status" = 'SOLD'::"SeatStatus",
          "heldUntil" = NULL,
          "orderId" = ${orderId}
      WHERE "eventId" = ${order.eventId}
        AND "holdToken" = ${order.holdToken}
        AND "status" = 'HELD'::"SeatStatus"
      RETURNING "id", "label"
    `;

    if (soldRows.length !== heldSeats.length) {
      throw new OrderHoldInvalidError(
        "HOLD_TAKEN",
        "Kursi tidak lagi tersedia untuk dikonfirmasi."
      );
    }

    const paymentRef = `SIM-${now.getTime().toString(36).toUpperCase()}`;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: now,
        paymentRef,
      },
    });

    await tx.event.update({
      where: { id: order.eventId },
      data: { layoutLocked: true },
    });

    const createdTickets: { id: string; code: string; seatId: string; seatLabel: string }[] = [];
    for (const s of soldRows) {
      let code = generateTicketCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await tx.ticket.findUnique({ where: { code }, select: { id: true } });
        if (!exists) break;
        code = generateTicketCode();
      }
      const ticket = await tx.ticket.create({
        data: {
          orderId,
          eventId: order.eventId,
          seatId: s.id,
          code,
          status: "VALID",
        },
      });
      createdTickets.push({
        id: ticket.id,
        code: ticket.code,
        seatId: s.id,
        seatLabel: s.label,
      });
    }

    return {
      status: "PAID" as const,
      alreadyPaid: false,
      orderId,
      tickets: createdTickets,
    };
  });

  // Jika transaksi mendeteksi kedaluwarsa atau kursi telah diambil, dispatch event dan lempar error
  if (result.status === "EXPIRED") {
    if (result.releasedSeats && result.releasedSeats.length > 0) {
      await dispatchSeatsReleased({
        eventId: result.eventId!,
        orderId: result.orderId,
        reason: "EXPIRED",
        releasedSeats: result.releasedSeats,
        timestamp: new Date(),
      });
    }
    throw new OrderHoldInvalidError(
      "ORDER_EXPIRED",
      "Waktu reservasi telah habis (melewati 10 menit). Kursi telah dilepas dan pembayaran ditolak."
    );
  }

  if (result.status === "HOLD_TAKEN") {
    if (result.releasedSeats && result.releasedSeats.length > 0) {
      await dispatchSeatsReleased({
        eventId: result.eventId!,
        orderId: result.orderId,
        reason: "EXPIRED",
        releasedSeats: result.releasedSeats,
        timestamp: new Date(),
      });
    }
    throw new OrderHoldInvalidError(
      "HOLD_TAKEN",
      "Masa tahan kursi sudah habis dan kursi telah diambil pengunjung lain. Kursi tidak dijual dua kali."
    );
  }

  return {
    alreadyPaid: result.alreadyPaid ?? false,
    orderId: result.orderId,
    tickets: result.tickets ?? [],
  };
}

export interface ExpireStaleOrdersOptions {
  batchSize?: number;
  notifyBuyers?: boolean;
  requestOrigin?: string;
}

export interface ExpiredOrderSummary {
  orderId: string;
  eventId: string;
  buyerName: string;
  buyerPhone: string;
  releasedSeatCount: number;
  releasedSeatLabels: string[];
  waNotificationStatus: "SENT" | "FAILED" | "SKIPPED" | "ALREADY_NOTIFIED";
}

export interface ExpireStaleOrdersResult {
  sweptCount: number;
  releasedSeatTotal: number;
  orders: ExpiredOrderSummary[];
  durationMs: number;
}

/**
 * Expiration Engine utama:
 * Memindai dan memulihkan seluruh pesanan PENDING yang telah melewati holdExpiresAt (server time).
 * Memakai PostgreSQL `FOR UPDATE SKIP LOCKED` sehingga aman dijalankan oleh multiple background worker
 * / cron jobs secara paralel tanpa deadlock atau race condition.
 */
export async function expireStaleOrders(
  options: ExpireStaleOrdersOptions = {}
): Promise<ExpireStaleOrdersResult> {
  const startTime = Date.now();
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 100, 500));
  const notifyBuyers = options.notifyBuyers ?? true;
  const now = new Date();

  // 1. Ambil dan kunci pesanan kedaluwarsa dengan SKIP LOCKED dalam transaksi atomik
  const processedOrders = await prisma.$transaction(
    async (tx) => {
      const expiredOrders = await tx.$queryRaw<
        {
          id: string;
          eventId: string;
          holdToken: string;
          buyerName: string;
          buyerPhone: string;
          expiredNotifiedAt: Date | null;
        }[]
      >`
        SELECT "id", "eventId", "holdToken", "buyerName", "buyerPhone", "expiredNotifiedAt"
        FROM "Order"
        WHERE "status" = 'PENDING'::"OrderStatus"
          AND "holdExpiresAt" <= ${now}
        ORDER BY "holdExpiresAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (expiredOrders.length === 0) {
        return [];
      }

      const orderSummaries: Array<{
        orderId: string;
        eventId: string;
        buyerName: string;
        buyerPhone: string;
        expiredNotifiedAt: Date | null;
        releasedSeats: Array<{ id: string; label: string; zoneId: string | null }>;
      }> = [];

      for (const ord of expiredOrders) {
        // Ubah status order menjadi EXPIRED dan simpan timestamp expiration
        await tx.order.update({
          where: { id: ord.id },
          data: {
            status: "EXPIRED",
            expiredAt: now,
          },
        });

        // Kembalikan kursi milik order tersebut menjadi AVAILABLE
        const releasedSeats = await tx.$queryRaw<
          { id: string; label: string; zoneId: string | null }[]
        >`
          UPDATE "Seat"
          SET "status" = 'AVAILABLE'::"SeatStatus",
              "heldUntil" = NULL,
              "holdToken" = NULL,
              "orderId" = NULL
          WHERE "holdToken" = ${ord.holdToken}
            AND "status" = 'HELD'::"SeatStatus"
          RETURNING "id", "label", "zoneId"
        `;

        orderSummaries.push({
          orderId: ord.id,
          eventId: ord.eventId,
          buyerName: ord.buyerName,
          buyerPhone: ord.buyerPhone,
          expiredNotifiedAt: ord.expiredNotifiedAt,
          releasedSeats,
        });

        // Integrasi modul waiting list: dispatch event kursi dilepas
        if (releasedSeats.length > 0) {
          await dispatchSeatsReleased({
            eventId: ord.eventId,
            orderId: ord.id,
            reason: "EXPIRED",
            releasedSeats,
            timestamp: now,
          });
        }
      }

      return orderSummaries;
    },
    { maxWait: 15000, timeout: 25000 }
  );

  // 2. Di luar transaksi: kirim notifikasi WhatsApp ke pembeli (non-blocking)
  const summaries: ExpiredOrderSummary[] = [];
  let totalSeats = 0;

  for (const ord of processedOrders) {
    totalSeats += ord.releasedSeats.length;
    const seatLabels = ord.releasedSeats.map((s) => s.label);
    let waStatus: "SENT" | "FAILED" | "SKIPPED" | "ALREADY_NOTIFIED" = "SKIPPED";

    if (ord.expiredNotifiedAt) {
      waStatus = "ALREADY_NOTIFIED";
    } else if (notifyBuyers) {
      try {
        const res = await sendOrderExpiredWhatsApp(
          ord.orderId,
          seatLabels,
          options.requestOrigin
        );
        waStatus = res.status;
      } catch (err) {
        console.error(
          `[ExpiredOrderRecovery] Gagal kirim WA ke ${ord.buyerPhone} (non-blocking):`,
          err
        );
        waStatus = "FAILED";
      }
    }

    summaries.push({
      orderId: ord.orderId,
      eventId: ord.eventId,
      buyerName: ord.buyerName,
      buyerPhone: ord.buyerPhone,
      releasedSeatCount: ord.releasedSeats.length,
      releasedSeatLabels: seatLabels,
      waNotificationStatus: waStatus,
    });
  }

  const durationMs = Date.now() - startTime;
  if (processedOrders.length > 0) {
    console.log(
      `[ExpiredOrderRecovery] Berhasil memulihkan ${processedOrders.length} pesanan kedaluwarsa, ${totalSeats} kursi dikembalikan ke AVAILABLE (${durationMs}ms)`
    );
  }

  return {
    sweptCount: processedOrders.length,
    releasedSeatTotal: totalSeats,
    orders: summaries,
    durationMs,
  };
}
