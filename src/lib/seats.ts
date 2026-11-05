import { prisma } from "./db.ts";
import { generateHoldToken, generateOrderId, generateTicketCode } from "./qr.ts";

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
    const rows = await tx.$queryRaw<{ id: string; status: string; holdToken: string }[]>`
      SELECT "id", "status"::text AS "status", "holdToken"
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

    const releasedCount = await tx.$executeRaw`
      UPDATE "Seat"
      SET "status" = 'AVAILABLE'::"SeatStatus",
          "heldUntil" = NULL,
          "holdToken" = NULL,
          "orderId" = NULL
      WHERE "holdToken" = ${order.holdToken}
        AND "status" = 'HELD'::"SeatStatus"
    `;

    const finalStatus = order.status === "EXPIRED" ? "EXPIRED" : nextOrderStatus;
    if (order.status === "PENDING") {
      await tx.order.update({
        where: { id: orderId },
        data: { status: finalStatus },
      });
    }

    return { releasedSeats: Number(releasedCount), status: finalStatus };
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
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      {
        id: string;
        eventId: string;
        status: string;
        totalAmount: number;
        holdToken: string;
      }[]
    >`
      SELECT "id", "eventId", "status"::text AS "status", "totalAmount", "holdToken"
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

    // Jika tidak ada kursi atau sebagian kursi sudah diambil orang lain setelah hold kedaluwarsa
    if (heldSeats.length === 0 || heldSum !== order.totalAmount) {
      await tx.$executeRaw`
        UPDATE "Seat"
        SET "status" = 'AVAILABLE'::"SeatStatus",
            "heldUntil" = NULL,
            "holdToken" = NULL,
            "orderId" = NULL
        WHERE "holdToken" = ${order.holdToken}
          AND "status" = 'HELD'::"SeatStatus"
      `;
      await tx.order.update({
        where: { id: orderId },
        data: { status: "EXPIRED" },
      });
      throw new OrderHoldInvalidError(
        "HOLD_TAKEN",
        "Masa tahan kursi sudah habis dan kursi telah diambil pengunjung lain. Kursi tidak dijual dua kali."
      );
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

    const now = new Date();
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
      alreadyPaid: false,
      orderId,
      tickets: createdTickets,
    };
  });
}
