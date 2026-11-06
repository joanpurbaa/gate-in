import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { normalizePhoneTo62 } from "@/lib/phone";
import type {
  OrganizerPromoItem,
  OrganizerPromoStats,
  ValidatePromoInput,
  ValidatePromoResult,
} from "./types";

/**
 * Menghitung jumlah penggunaan promo yang aktif (CONFIRMED atau RESERVED yang belum kedaluwarsa).
 */
export async function getActivePromoUsageCount(
  promoId: string,
  now: Date = new Date(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = prisma
): Promise<number> {
  const count = await client.promoUsage.count({
    where: {
      promoId,
      OR: [
        { status: "CONFIRMED" },
        {
          status: "RESERVED",
          order: {
            status: "PENDING",
            holdExpiresAt: { gt: now },
          },
        },
      ],
    },
  });
  return count;
}

/**
 * Menghitung penggunaan promo oleh pembeli tertentu (berdasarkan nomor WhatsApp 62xxx).
 */
export async function getBuyerPromoUsageCount(
  promoId: string,
  buyerPhone: string,
  now: Date = new Date(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = prisma
): Promise<number> {
  const phone = normalizePhoneTo62(buyerPhone) || buyerPhone;
  const count = await client.promoUsage.count({
    where: {
      promoId,
      buyerPhone: phone,
      OR: [
        { status: "CONFIRMED" },
        {
          status: "RESERVED",
          order: {
            status: "PENDING",
            holdExpiresAt: { gt: now },
          },
        },
      ],
    },
  });
  return count;
}

/**
 * Validasi kode promo secara menyeluruh dan hitung nilai diskon di sisi server.
 */
export async function validatePromoCode(
  input: ValidatePromoInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = prisma
): Promise<ValidatePromoResult> {
  const cleanCode = input.promoCode.trim().toUpperCase();
  if (!cleanCode) {
    return {
      valid: false,
      error: "Masukkan kode promo",
      code: "INVALID_INPUT",
    };
  }

  // 1. Cek keberadaan event dan penyelenggaranya
  const event = await client.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, organizerId: true, status: true, name: true },
  });

  if (!event) {
    return {
      valid: false,
      error: "Acara tidak ditemukan",
      code: "EVENT_MISMATCH",
    };
  }

  // 2. Cari kode promo milik penyelenggara acara ini
  const promo = await client.promotion.findFirst({
    where: {
      organizerId: event.organizerId,
      code: cleanCode,
    },
    include: {
      event: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
    },
  });

  if (!promo) {
    return {
      valid: false,
      error: `Kode promo "${cleanCode}" tidak ditemukan`,
      code: "PROMO_NOT_FOUND",
    };
  }

  // 3. Status aktif/nonaktif
  if (!promo.isActive) {
    return {
      valid: false,
      error: `Kode promo "${promo.code}" saat ini sedang dinonaktifkan oleh penyelenggara`,
      code: "PROMO_INACTIVE",
    };
  }

  // 4. Batas Waktu Periode Promo (server time)
  const now = new Date();
  if (now < promo.startsAt) {
    return {
      valid: false,
      error: `Kode promo "${promo.code}" belum dapat digunakan (periode promo baru dimulai pada ${promo.startsAt.toLocaleDateString("id-ID")})`,
      code: "PROMO_NOT_STARTED",
    };
  }

  if (now > promo.expiresAt) {
    return {
      valid: false,
      error: `Masa berlaku kode promo "${promo.code}" telah berakhir`,
      code: "PROMO_EXPIRED",
    };
  }

  // 5. Kesesuaian Acara (Event Match)
  if (promo.eventId && promo.eventId !== input.eventId) {
    return {
      valid: false,
      error: `Kode promo ini hanya berlaku untuk acara "${promo.event?.name ?? "tertentu"}"`,
      code: "EVENT_MISMATCH",
    };
  }

  // 6. Ambil kursi yang dipilih pembeli langsung dari database
  const uniqueLabels = Array.from(new Set(input.seatLabels.map((l) => l.trim()))).filter(Boolean);
  if (uniqueLabels.length === 0) {
    return {
      valid: false,
      error: "Pilih kursi terlebih dahulu sebelum menerapkan promo",
      code: "INVALID_INPUT",
    };
  }

  const dbSeats = await client.seat.findMany({
    where: {
      eventId: input.eventId,
      label: { in: uniqueLabels },
    },
    include: { zone: true },
  });

  if (dbSeats.length !== uniqueLabels.length) {
    return {
      valid: false,
      error: "Sebagian kursi yang dipilih tidak ditemukan",
      code: "INVALID_INPUT",
    };
  }

  // 7. Kesesuaian Zona Tiket (Zone Match jika dikonfigurasi)
  if (promo.zoneId) {
    const matchingZoneSeats = dbSeats.filter((s: { zoneId: string | null }) => s.zoneId === promo.zoneId);
    if (matchingZoneSeats.length === 0) {
      return {
        valid: false,
        error: `Kode promo "${promo.code}" hanya berlaku untuk tiket Zona ${promo.zone?.name ?? ""}`,
        code: "ZONE_MISMATCH",
      };
    }
  }

  // 8. Hitung Subtotal Resmi dari Database
  const subtotal = dbSeats.reduce((sum: number, s: { zone: { price: number } | null }) => sum + (s.zone?.price ?? 0), 0);

  // 9. Cek Minimum Pembelian
  if (promo.minPurchaseAmount > 0 && subtotal < promo.minPurchaseAmount) {
    return {
      valid: false,
      error: `Minimum pembelian untuk menggunakan promo ini adalah ${formatRupiah(promo.minPurchaseAmount)} (subtotal saat ini: ${formatRupiah(subtotal)})`,
      code: "MIN_PURCHASE_NOT_MET",
    };
  }

  // 10. Cek Kuota Penggunaan Promo
  if (promo.totalQuota !== null) {
    const activeUsages = await getActivePromoUsageCount(promo.id, now, client);
    if (activeUsages >= promo.totalQuota) {
      return {
        valid: false,
        error: `Kuota penggunaan kode promo "${promo.code}" telah habis`,
        code: "QUOTA_EXHAUSTED",
      };
    }
  }

  // 11. Cek Batas Penggunaan per Pembeli
  if (input.buyerPhone) {
    const buyerPhone = normalizePhoneTo62(input.buyerPhone);
    if (buyerPhone) {
      const buyerUsageCount = await getBuyerPromoUsageCount(promo.id, buyerPhone, now, client);
      if (buyerUsageCount >= promo.maxUsesPerUser) {
        return {
          valid: false,
          error: `Nomor WhatsApp Anda telah mencapai batas maksimal (${promo.maxUsesPerUser}x) penggunaan promo ini`,
          code: "USER_LIMIT_REACHED",
        };
      }
    }
  }

  // 12. Kalkulasi Nilai Diskon
  let eligibleSubtotal = subtotal;
  if (promo.zoneId) {
    eligibleSubtotal = dbSeats
      .filter((s: { zoneId: string | null }) => s.zoneId === promo.zoneId)
      .reduce((sum: number, s: { zone: { price: number } | null }) => sum + (s.zone?.price ?? 0), 0);
  }

  let calculatedDiscount = 0;
  if (promo.discountType === "PERCENTAGE") {
    const rawDiscount = Math.floor((eligibleSubtotal * promo.discountValue) / 100);
    if (promo.maxDiscountAmount && promo.maxDiscountAmount > 0) {
      calculatedDiscount = Math.min(rawDiscount, promo.maxDiscountAmount);
    } else {
      calculatedDiscount = rawDiscount;
    }
  } else {
    // FIXED_AMOUNT
    calculatedDiscount = Math.min(eligibleSubtotal, promo.discountValue);
  }

  // Nilai diskon tidak pernah boleh melebihi subtotal
  const discountAmount = Math.max(0, Math.min(subtotal, calculatedDiscount));
  const finalTotal = Math.max(0, subtotal - discountAmount);

  return {
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxDiscountAmount: promo.maxDiscountAmount,
      minPurchaseAmount: promo.minPurchaseAmount,
      eventId: promo.eventId,
      zoneId: promo.zoneId,
    },
    subtotal,
    discountAmount,
    finalTotal,
    eligibleSeatsCount: promo.zoneId
      ? dbSeats.filter((s: { zoneId: string | null }) => s.zoneId === promo.zoneId).length
      : dbSeats.length,
  };
}

/**
 * Mengambil daftar promo milik organizer beserta metrik performanya.
 */
export async function getOrganizerPromos(organizerId: string): Promise<OrganizerPromoItem[]> {
  const promos = await prisma.promotion.findMany({
    where: { organizerId },
    include: {
      event: { select: { name: true } },
      zone: { select: { name: true } },
      usages: {
        where: { status: "CONFIRMED" },
        include: {
          order: {
            select: { totalAmount: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return promos.map((p) => {
    const confirmedUsages = p.usages;
    const usedQuota = confirmedUsages.length;
    const totalDiscountGiven = confirmedUsages.reduce((sum, u) => sum + u.discountAmount, 0);
    const totalSalesGenerated = confirmedUsages.reduce(
      (sum, u) => sum + (u.order?.status === "PAID" ? u.order.totalAmount : 0),
      0
    );

    let statusText: OrganizerPromoItem["statusText"] = "ACTIVE";
    if (!p.isActive) {
      statusText = "INACTIVE";
    } else if (p.totalQuota !== null && usedQuota >= p.totalQuota) {
      statusText = "EXHAUSTED";
    } else if (now < p.startsAt) {
      statusText = "UPCOMING";
    } else if (now > p.expiresAt) {
      statusText = "EXPIRED";
    }

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxDiscountAmount: p.maxDiscountAmount,
      minPurchaseAmount: p.minPurchaseAmount,
      eventId: p.eventId,
      eventName: p.event?.name ?? null,
      zoneId: p.zoneId,
      zoneName: p.zone?.name ?? null,
      startsAt: p.startsAt.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
      totalQuota: p.totalQuota,
      usedQuota,
      maxUsesPerUser: p.maxUsesPerUser,
      isActive: p.isActive,
      totalDiscountGiven,
      totalSalesGenerated,
      statusText,
      createdAt: p.createdAt.toISOString(),
    };
  });
}

/**
 * Ringkasan statistik promosi untuk organizer dashboard.
 */
export async function getOrganizerPromoStats(organizerId: string): Promise<OrganizerPromoStats> {
  const promos = await prisma.promotion.findMany({
    where: { organizerId },
    include: {
      usages: {
        where: { status: "CONFIRMED" },
        include: {
          order: { select: { totalAmount: true, status: true } },
        },
      },
    },
  });

  const now = new Date();
  const totalPromos = promos.length;
  let activePromos = 0;
  let endedPromos = 0;
  let totalUsages = 0;
  let totalDiscountGiven = 0;
  let totalSalesGenerated = 0;
  const uniqueBuyerSet = new Set<string>();

  for (const p of promos) {
    const isEnded = !p.isActive || now > p.expiresAt || (p.totalQuota !== null && p.usages.length >= p.totalQuota);
    if (isEnded) {
      endedPromos++;
    } else {
      activePromos++;
    }

    for (const u of p.usages) {
      totalUsages++;
      uniqueBuyerSet.add(u.buyerPhone);
      totalDiscountGiven += u.discountAmount;
      if (u.order?.status === "PAID") {
        totalSalesGenerated += u.order.totalAmount;
      }
    }
  }

  return {
    totalPromos,
    activePromos,
    endedPromos,
    totalUsages,
    uniqueBuyers: uniqueBuyerSet.size,
    totalDiscountGiven,
    totalSalesGenerated,
  };
}
