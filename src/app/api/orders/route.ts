import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhoneTo62 } from "@/lib/phone";
import { holdSeatsAndCreateOrder, SeatsTakenError } from "@/lib/seats";

const createOrderSchema = z.object({
  eventId: z.string().min(1, "ID event wajib diisi"),
  buyerName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama terlalu panjang"),
  buyerPhone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi").max(25),
  seatLabels: z
    .array(z.string().trim().min(1).max(20))
    .min(1, "Pilih minimal 1 kursi")
    .max(10, "Terlalu banyak kursi dipilih"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid" },
      { status: 400 }
    );
  }

  const { eventId, buyerName, buyerPhone, seatLabels } = parsed.data;
  const phone62 = normalizePhoneTo62(buyerPhone);
  if (!phone62) {
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid. Gunakan nomor Indonesia (08xxx / 628xxx)." },
      { status: 400 }
    );
  }

  const uniqueLabels = Array.from(new Set(seatLabels));

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      salesOpenAt: true,
      salesCloseAt: true,
      maxSeatsPerOrder: true,
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Acara tidak ditemukan atau belum dibuka" }, { status: 404 });
  }

  const now = new Date();
  if (now < event.salesOpenAt) {
    return NextResponse.json({ error: "Penjualan tiket belum dibuka" }, { status: 400 });
  }
  if (now > event.salesCloseAt) {
    return NextResponse.json({ error: "Penjualan tiket sudah ditutup" }, { status: 400 });
  }
  if (uniqueLabels.length > event.maxSeatsPerOrder) {
    return NextResponse.json(
      { error: `Maksimal ${event.maxSeatsPerOrder} kursi per pesanan` },
      { status: 400 }
    );
  }

  try {
    const held = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: uniqueLabels,
      buyerName,
      buyerPhone: phone62,
    });

    return NextResponse.json(
      {
        orderId: held.orderId,
        holdExpiresAt: held.holdExpiresAt.toISOString(),
        totalAmount: held.totalAmount,
        seats: held.seats,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof SeatsTakenError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          takenLabels: err.takenLabels,
        },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Gagal menahan kursi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
