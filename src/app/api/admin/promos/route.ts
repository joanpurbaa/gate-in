import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrganizerPromos, getOrganizerPromoStats } from "@/lib/promo/service";

const createPromoSchema = z
  .object({
    name: z.string().trim().min(2, "Nama promo minimal 2 karakter").max(100),
    code: z
      .string()
      .trim()
      .min(3, "Kode promo minimal 3 karakter")
      .max(30, "Kode promo maksimal 30 karakter")
      .regex(/^[A-Za-z0-9_-]+$/, "Kode promo hanya boleh huruf, angka, garis bawah, atau tanda hubung")
      .transform((val) => val.toUpperCase()),
    description: z.string().trim().max(500).optional().default(""),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.number().int().positive("Nilai diskon harus lebih besar dari 0"),
    maxDiscountAmount: z.number().int().positive().nullable().optional(),
    minPurchaseAmount: z.number().int().min(0).default(0),
    eventId: z.string().nullable().optional(),
    zoneId: z.string().nullable().optional(),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    totalQuota: z.number().int().positive().nullable().optional(),
    maxUsesPerUser: z.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Diskon persentase maksimal 100%",
      path: ["discountValue"],
    }
  )
  .refine(
    (data) => {
      return new Date(data.expiresAt) > new Date(data.startsAt);
    },
    {
      message: "Waktu berakhir promo harus setelah waktu mulai",
      path: ["expiresAt"],
    }
  );

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const [promos, stats] = await Promise.all([
    getOrganizerPromos(session.organizerId),
    getOrganizerPromoStats(session.organizerId),
  ]);

  return NextResponse.json({ promos, stats });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = createPromoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verifikasi kepemilikan acara jika dibatasi ke acara tertentu
  if (data.eventId) {
    const owned = await getOwnedEventOrNull(data.eventId, session.organizerId);
    if (!owned) {
      return NextResponse.json(
        { error: "Acara yang dipilih tidak ditemukan atau bukan milik Anda" },
        { status: 403 }
      );
    }

    // Jika dibatasi ke zona tertentu, verifikasi zona berada di dalam acara tersebut
    if (data.zoneId) {
      const zone = await prisma.zone.findFirst({
        where: { id: data.zoneId, eventId: data.eventId },
      });
      if (!zone) {
        return NextResponse.json(
          { error: "Zona tiket yang dipilih tidak ditemukan pada acara ini" },
          { status: 400 }
        );
      }
    }
  } else if (data.zoneId) {
    // Zona tidak boleh diatur jika acara tidak dipilih
    return NextResponse.json(
      { error: "Pilih acara terlebih dahulu jika ingin membatasi promo ke zona tertentu" },
      { status: 400 }
    );
  }

  // Cek keunikan kode promo untuk penyelenggara ini
  const existing = await prisma.promotion.findUnique({
    where: {
      organizerId_code: {
        organizerId: session.organizerId,
        code: data.code,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Kode promo "${data.code}" sudah ada. Gunakan kode yang berbeda.` },
      { status: 409 }
    );
  }

  const promo = await prisma.promotion.create({
    data: {
      organizerId: session.organizerId,
      name: data.name,
      code: data.code,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountAmount: data.discountType === "PERCENTAGE" ? data.maxDiscountAmount : null,
      minPurchaseAmount: data.minPurchaseAmount,
      eventId: data.eventId || null,
      zoneId: data.zoneId || null,
      startsAt: new Date(data.startsAt),
      expiresAt: new Date(data.expiresAt),
      totalQuota: data.totalQuota || null,
      maxUsesPerUser: data.maxUsesPerUser,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ promo }, { status: 201 });
}
