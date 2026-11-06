import { prisma } from "@/lib/db";
import { sendWaitingListOfferWhatsApp } from "@/lib/wa";

export const DEFAULT_OFFER_DURATION_MS = 15 * 60 * 1000; // 15 menit

export interface MatchWaitingListResult {
  eventId: string;
  matchedCount: number;
  offeredCandidates: {
    id: string;
    buyerName: string;
    buyerPhone: string;
    zoneId: string;
    quantity: number;
    offerExpiresAt: string;
  }[];
}

/**
 * Memeriksa dan mengubah status penawaran yang telah melewati batas waktu (offerExpiresAt <= now)
 * dari OFFERED menjadi EXPIRED.
 * Setiap penawaran yang kedaluwarsa akan memicu pencocokan ulang antrean agar tiket
 * segera diteruskan ke kandidat berikutnya secara otomatis.
 */
export async function sweepExpiredOffers(
  eventId?: string
): Promise<{ expiredCount: number; expiredIds: string[] }> {
  const now = new Date();

  const expiredEntries = await prisma.waitingListEntry.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      status: "OFFERED",
      offerExpiresAt: { lte: now },
    },
    select: {
      id: true,
      eventId: true,
      zoneId: true,
      buyerName: true,
    },
  });

  if (expiredEntries.length === 0) {
    return { expiredCount: 0, expiredIds: [] };
  }

  const expiredIds = expiredEntries.map((e) => e.id);

  await prisma.waitingListEntry.updateMany({
    where: {
      id: { in: expiredIds },
      status: "OFFERED",
    },
    data: {
      status: "EXPIRED",
      updatedAt: now,
    },
  });

  console.log(
    `[WaitingList:Sweep] ${expiredEntries.length} penawaran kedaluwarsa diubah menjadi EXPIRED:`,
    expiredEntries.map((e) => `${e.buyerName} (${e.id})`).join(", ")
  );

  return {
    expiredCount: expiredEntries.length,
    expiredIds,
  };
}

/**
 * Engine pencocokan ketersediaan kursi dengan antrean Waiting List:
 * 1. Menjalankan sweepExpiredOffers untuk membebaskan penawaran yang kedaluwarsa.
 * 2. Menghitung jumlah kursi efektif tersedia pada tiap zona (total tersedia - penawaran aktif).
 * 3. Memilih kandidat secara FIFO (First In, First Out) dalam kelompok acara & zona yang sama.
 * 4. Aturan Utuh: Calon pembeli yang meminta Q kursi hanya ditawari jika kuota tersedia >= Q.
 * 5. Mengubah status secara atomik menjadi OFFERED dan menetapkan offerExpiresAt (15 menit).
 * 6. Mengirim notifikasi WhatsApp via Fonnte secara non-blocking.
 */
export async function matchWaitingListForEvent(
  eventId: string,
  zoneId?: string,
  requestOrigin?: string
): Promise<MatchWaitingListResult> {
  // 1. Bersihkan penawaran kedaluwarsa terlebih dahulu
  await sweepExpiredOffers(eventId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      zones: {
        ...(zoneId ? { where: { id: zoneId } } : {}),
        select: { id: true, name: true },
      },
      seats: {
        ...(zoneId ? { where: { zoneId } } : {}),
        select: {
          id: true,
          zoneId: true,
          status: true,
          heldUntil: true,
        },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    return { eventId, matchedCount: 0, offeredCandidates: [] };
  }

  const now = new Date();
  const offeredCandidates: MatchWaitingListResult["offeredCandidates"] = [];

  for (const zone of event.zones) {
    // Hitung total kursi yang saat ini berstatus AVAILABLE atau HELD yang sudah lewat heldUntil
    const zoneSeats = event.seats.filter((s) => s.zoneId === zone.id);
    const totalAvailable = zoneSeats.filter(
      (s) =>
        s.status === "AVAILABLE" ||
        (s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now))
    ).length;

    // Hitung kursi yang sedang ditawarkan aktif kepada kandidat lain (belum kedaluwarsa)
    const activeOffers = await prisma.waitingListEntry.findMany({
      where: {
        eventId: event.id,
        zoneId: zone.id,
        status: "OFFERED",
        offerExpiresAt: { gt: now },
      },
      select: {
        quantity: true,
      },
    });

    const activeOfferedSeats = activeOffers.reduce(
      (sum, o) => sum + o.quantity,
      0
    );

    let effectiveAvailable = Math.max(0, totalAvailable - activeOfferedSeats);
    if (effectiveAvailable <= 0) {
      continue;
    }

    // Ambil antrean kandidat dengan urutan FIFO (createdAt ASC)
    const waitingCandidates = await prisma.waitingListEntry.findMany({
      where: {
        eventId: event.id,
        zoneId: zone.id,
        status: "WAITING",
      },
      orderBy: { createdAt: "asc" },
    });

    for (const candidate of waitingCandidates) {
      if (effectiveAvailable <= 0) break;

      // Aturan jumlah kursi: pendaftar harus mendapatkan jumlah kursi sesuai kebutuhannya
      if (candidate.quantity <= effectiveAvailable) {
        const offerExpiresAt = new Date(Date.now() + DEFAULT_OFFER_DURATION_MS);

        // Update atomik untuk mencegah race condition antar worker/proses
        const updateResult = await prisma.waitingListEntry.updateMany({
          where: {
            id: candidate.id,
            status: "WAITING",
          },
          data: {
            status: "OFFERED",
            offerExpiresAt,
            updatedAt: new Date(),
          },
        });

        if (updateResult.count === 1) {
          effectiveAvailable -= candidate.quantity;

          offeredCandidates.push({
            id: candidate.id,
            buyerName: candidate.buyerName,
            buyerPhone: candidate.buyerPhone,
            zoneId: zone.id,
            quantity: candidate.quantity,
            offerExpiresAt: offerExpiresAt.toISOString(),
          });

          // Notifikasi WhatsApp non-blocking
          sendWaitingListOfferWhatsApp(candidate.id, requestOrigin).catch(
            (err) => {
              console.error(
                `[WaitingList:WA] Gagal mengirim penawaran ke ${candidate.buyerPhone}:`,
                err
              );
            }
          );
        }
      }
      // Jika candidate.quantity > effectiveAvailable, kandidat tetap berada di antrean WAITING
      // dan tidak diberikan alokasi parsial.
    }
  }

  return {
    eventId,
    matchedCount: offeredCandidates.length,
    offeredCandidates,
  };
}
