import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizePhoneTo62 } from "@/lib/phone";
import type {
  RegisterWaitingListInput,
  WaitingListEntryDetails,
  ZoneWaitingSummary,
} from "./types";

interface ClientWithWaitingList {
  waitingListEntry?: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
}

export class WaitingListError extends Error {
  code: string;
  constructor(message: string, code = "WAITING_LIST_ERROR") {
    super(message);
    this.name = "WaitingListError";
    this.code = code;
  }
}

export function generateWaitingListToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Pendaftaran calon pembeli ke dalam antrean Smart Waiting List.
 * Menegakkan aturan:
 * 1. Event harus published dan zona harus valid.
 * 2. Nomor telepon valid format Indonesia (62xxx).
 * 3. Tidak boleh duplikat aktif (status WAITING atau OFFERED) untuk no HP + event + zone yang sama.
 * 4. Quantity harus antara 1 sampai maxSeatsPerOrder acara.
 */
export async function registerWaitingList(
  input: RegisterWaitingListInput
): Promise<{
  entry: WaitingListEntryDetails;
  queuePosition: number;
}> {
  const buyerName = input.buyerName.trim();
  if (buyerName.length < 2) {
    throw new WaitingListError("Nama pemesan minimal 2 karakter", "INVALID_NAME");
  }

  const normalizedPhone = normalizePhoneTo62(input.buyerPhone);
  if (!normalizedPhone) {
    throw new WaitingListError(
      "Nomor WhatsApp tidak valid. Gunakan format Indonesia (contoh: 08123456789).",
      "INVALID_PHONE"
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: {
      zones: true,
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    throw new WaitingListError("Acara tidak ditemukan atau belum dipublikasikan", "EVENT_NOT_FOUND");
  }

  const targetZone = event.zones.find((z) => z.id === input.zoneId);
  if (!targetZone) {
    throw new WaitingListError("Zona tiket tidak ditemukan untuk acara ini", "ZONE_NOT_FOUND");
  }

  const qty = Math.floor(input.quantity);
  if (qty < 1 || qty > event.maxSeatsPerOrder) {
    throw new WaitingListError(
      `Jumlah tiket harus antara 1 sampai ${event.maxSeatsPerOrder} tiket`,
      "INVALID_QUANTITY"
    );
  }

  // Cek duplikasi entri aktif (status WAITING atau OFFERED)
  const existingActive = await prisma.waitingListEntry.findFirst({
    where: {
      eventId: event.id,
      zoneId: targetZone.id,
      buyerPhone: normalizedPhone,
      status: { in: ["WAITING", "OFFERED"] },
    },
  });

  if (existingActive) {
    throw new WaitingListError(
      `Nomor WhatsApp ${normalizedPhone} sudah terdaftar dalam antrean waiting list untuk zona ${targetZone.name}. Silakan pantau status antrean Anda.`,
      "DUPLICATE_ENTRY"
    );
  }

  const token = generateWaitingListToken();

  const created = await prisma.waitingListEntry.create({
    data: {
      eventId: event.id,
      zoneId: targetZone.id,
      buyerName,
      buyerPhone: normalizedPhone,
      quantity: qty,
      status: "WAITING",
      token,
    },
  });

  // Hitung posisi antrean FIFO dalam zona yang sama
  const queuePosition = await prisma.waitingListEntry.count({
    where: {
      eventId: event.id,
      zoneId: targetZone.id,
      status: "WAITING",
      createdAt: { lte: created.createdAt },
    },
  });

  return {
    entry: {
      id: created.id,
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      venueName: event.venueName,
      startsAt: event.startsAt.toISOString(),
      zoneId: targetZone.id,
      zoneName: targetZone.name,
      zoneColor: targetZone.color,
      zonePrice: targetZone.price,
      buyerName: created.buyerName,
      buyerPhone: created.buyerPhone,
      quantity: created.quantity,
      status: created.status,
      token: created.token,
      queuePosition,
      offerExpiresAt: created.offerExpiresAt?.toISOString() ?? null,
      offerNotifiedAt: created.offerNotifiedAt?.toISOString() ?? null,
      convertedOrderId: created.convertedOrderId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    queuePosition,
  };
}

/**
 * Mengambil detail status pendaftaran waiting list menggunakan token rahasia.
 */
export async function getWaitingListStatus(
  token: string
): Promise<WaitingListEntryDetails | null> {
  const entry = await prisma.waitingListEntry.findUnique({
    where: { token },
    include: {
      event: true,
      zone: true,
    },
  });

  if (!entry) {
    return null;
  }

  let queuePosition: number | undefined;
  if (entry.status === "WAITING") {
    queuePosition = await prisma.waitingListEntry.count({
      where: {
        eventId: entry.eventId,
        zoneId: entry.zoneId,
        status: "WAITING",
        createdAt: { lte: entry.createdAt },
      },
    });
  }

  return {
    id: entry.id,
    eventId: entry.eventId,
    eventName: entry.event.name,
    eventSlug: entry.event.slug,
    venueName: entry.event.venueName,
    startsAt: entry.event.startsAt.toISOString(),
    zoneId: entry.zone.id,
    zoneName: entry.zone.name,
    zoneColor: entry.zone.color,
    zonePrice: entry.zone.price,
    buyerName: entry.buyerName,
    buyerPhone: entry.buyerPhone,
    quantity: entry.quantity,
    status: entry.status,
    token: entry.token,
    queuePosition,
    offerExpiresAt: entry.offerExpiresAt?.toISOString() ?? null,
    offerNotifiedAt: entry.offerNotifiedAt?.toISOString() ?? null,
    convertedOrderId: entry.convertedOrderId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

/**
 * Membatalkan antrean waiting list secara mandiri oleh pembeli.
 */
export async function cancelWaitingList(token: string): Promise<boolean> {
  const entry = await prisma.waitingListEntry.findUnique({
    where: { token },
  });

  if (!entry) {
    throw new WaitingListError("Data waiting list tidak ditemukan", "NOT_FOUND");
  }

  if (entry.status !== "WAITING" && entry.status !== "OFFERED") {
    throw new WaitingListError(
      `Status saat ini (${entry.status}) tidak dapat dibatalkan`,
      "INVALID_STATUS"
    );
  }

  await prisma.waitingListEntry.update({
    where: { id: entry.id },
    data: {
      status: "CANCELLED",
      updatedAt: new Date(),
    },
  });

  return true;
}

/**
 * Mengonversi penawaran waiting list setelah tiket berhasil dipesan / di-lock.
 */
export async function claimWaitingListOffer(
  token: string,
  orderId: string
): Promise<boolean> {
  const wlDelegate = (prisma as unknown as ClientWithWaitingList).waitingListEntry;
  if (!wlDelegate) return false;
  const result = await wlDelegate.updateMany({
    where: {
      token,
      status: "OFFERED",
      offerExpiresAt: { gt: new Date() },
    },
    data: {
      status: "CONVERTED",
      convertedOrderId: orderId,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Mengambil ringkasan statistik dan daftar waiting list untuk organizer dashboard.
 */
export async function getEventWaitingListDashboard(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      seats: {
        select: {
          id: true,
          zoneId: true,
          status: true,
          heldUntil: true,
        },
      },
    },
  });

  if (!event) {
    throw new WaitingListError("Acara tidak ditemukan", "EVENT_NOT_FOUND");
  }

  const now = new Date();
  const entries = await prisma.waitingListEntry.findMany({
    where: { eventId },
    include: {
      zone: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Hitung summary per zona
  const zoneSummaries: ZoneWaitingSummary[] = event.zones.map((zone) => {
    const zoneSeats = event.seats.filter((s) => s.zoneId === zone.id);
    const availableCount = zoneSeats.filter(
      (s) =>
        s.status === "AVAILABLE" ||
        (s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now))
    ).length;

    const zoneEntries = entries.filter((e) => e.zoneId === zone.id);
    const waitingEntries = zoneEntries.filter((e) => e.status === "WAITING");
    const activeOfferedEntries = zoneEntries.filter(
      (e) => e.status === "OFFERED" && e.offerExpiresAt && e.offerExpiresAt > now
    );

    const activeOfferedSeats = activeOfferedEntries.reduce(
      (sum, e) => sum + e.quantity,
      0
    );
    const waitingRequestedSeats = waitingEntries.reduce(
      (sum, e) => sum + e.quantity,
      0
    );

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      zoneColor: zone.color,
      zonePrice: zone.price,
      availableSeats: availableCount,
      activeOfferedSeats,
      waitingCount: waitingEntries.length,
      waitingRequestedSeats,
    };
  });

  const totalWaiting = entries.filter((e) => e.status === "WAITING").length;
  const totalOffered = entries.filter(
    (e) => e.status === "OFFERED" && e.offerExpiresAt && e.offerExpiresAt > now
  ).length;
  const totalConverted = entries.filter((e) => e.status === "CONVERTED").length;
  const totalExpired = entries.filter((e) => e.status === "EXPIRED").length;
  const totalCancelled = entries.filter((e) => e.status === "CANCELLED").length;

  return {
    stats: {
      totalEntries: entries.length,
      totalWaiting,
      totalOffered,
      totalConverted,
      totalExpired,
      totalCancelled,
    },
    zones: zoneSummaries,
    entries: entries.map((e, idx) => ({
      id: e.id,
      queueNumber: idx + 1,
      buyerName: e.buyerName,
      buyerPhone: e.buyerPhone,
      zoneId: e.zoneId,
      zoneName: e.zone.name,
      zoneColor: e.zone.color,
      quantity: e.quantity,
      status: e.status,
      token: e.token,
      offerExpiresAt: e.offerExpiresAt?.toISOString() ?? null,
      offerNotifiedAt: e.offerNotifiedAt?.toISOString() ?? null,
      convertedOrderId: e.convertedOrderId,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
