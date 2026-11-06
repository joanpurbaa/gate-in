import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updatePromoSchema = z
  .object({
    name: z.string().trim().min(2, "Nama promo minimal 2 karakter").max(100),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const { id } = await params;
  const promo = await prisma.promotion.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      usages: {
        include: {
          order: {
            select: {
              id: true,
              buyerName: true,
              buyerPhone: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!promo || promo.organizerId !== session.organizerId) {
    return NextResponse.json({ error: "Promo tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ promo });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.promotion.findUnique({
    where: { id },
  });

  if (!existing || existing.organizerId !== session.organizerId) {
    return NextResponse.json({ error: "Promo tidak ditemukan" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = updatePromoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verifikasi kepemilikan acara jika dipilih
  if (data.eventId) {
    const owned = await getOwnedEventOrNull(data.eventId, session.organizerId);
    if (!owned) {
      return NextResponse.json(
        { error: "Acara yang dipilih tidak ditemukan atau bukan milik Anda" },
        { status: 403 }
      );
    }

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
    return NextResponse.json(
      { error: "Pilih acara terlebih dahulu jika ingin membatasi promo ke zona tertentu" },
      { status: 400 }
    );
  }

  const updated = await prisma.promotion.update({
    where: { id },
    data: {
      name: data.name,
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

  return NextResponse.json({ promo: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.promotion.findUnique({
    where: { id },
    include: {
      _count: { select: { usages: true } },
    },
  });

  if (!existing || existing.organizerId !== session.organizerId) {
    return NextResponse.json({ error: "Promo tidak ditemukan" }, { status: 404 });
  }

  // Jika promo sudah pernah digunakan, lebih baik nonaktifkan daripada menghapus riwayat audit transaksi
  if (existing._count.usages > 0) {
    await prisma.promotion.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      success: true,
      message: "Promo telah dinonaktifkan karena telah memiliki riwayat transaksi.",
      deactivated: true,
    });
  }

  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Promo berhasil dihapus." });
}
