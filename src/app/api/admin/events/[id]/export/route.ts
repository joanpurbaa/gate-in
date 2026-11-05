import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatShortDateTime } from "@/lib/time";

/**
 * Sanitasi nilai sel CSV dari injeksi rumus spreadsheet (=, +, -, @, tab, CR)
 * dan bungkus dengan tanda kutip ganda.
 */
function csvCell(val: string | number | null | undefined): string {
  const raw = val == null ? "" : String(val);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await getOwnedEventOrNull(id, session.organizerId);
  if (!owned) {
    return NextResponse.json({ error: "Acara tidak ditemukan" }, { status: 404 });
  }

  const type = req.nextUrl.searchParams.get("type") === "transaksi" ? "transaksi" : "peserta";

  if (type === "transaksi") {
    const orders = await prisma.order.findMany({
      where: { eventId: owned.id },
      orderBy: { createdAt: "desc" },
      include: {
        seats: { select: { label: true } },
        tickets: { select: { code: true } },
      },
    });

    const header = [
      "ID Pesanan",
      "Nama Pemesan",
      "WhatsApp",
      "Status Pesanan",
      "Kursi",
      "Kode Tiket",
      "Total (Rp)",
      "Status WA",
      "Waktu Dibuat (WIB)",
      "Waktu Bayar (WIB)",
    ]
      .map(csvCell)
      .join(",");

    const lines = orders.map((o) =>
      [
        o.id,
        o.buyerName,
        o.buyerPhone,
        o.status,
        o.seats.map((s) => s.label).join(" "),
        o.tickets.map((t) => t.code).join(" "),
        o.totalAmount,
        o.waStatus ?? "-",
        formatShortDateTime(o.createdAt),
        o.paidAt ? formatShortDateTime(o.paidAt) : "-",
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = [header, ...lines].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transaksi-${owned.slug}.csv"`,
      },
    });
  }

  const tickets = await prisma.ticket.findMany({
    where: { eventId: owned.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: true,
      seat: {
        include: { zone: true },
      },
    },
  });

  const header = [
    "Kode Tiket",
    "Kursi",
    "Zona",
    "Harga (Rp)",
    "Nama Peserta",
    "WhatsApp",
    "Status Kehadiran",
    "Waktu Check-in (WIB)",
    "ID Pesanan",
  ]
    .map(csvCell)
    .join(",");

  const lines = tickets.map((t) =>
    [
      t.code,
      t.seat.label,
      t.seat.zone?.name ?? "Reguler",
      t.seat.zone?.price ?? 0,
      t.order.buyerName,
      t.order.buyerPhone,
      t.status === "USED" ? "HADIR" : "BELUM CHECK-IN",
      t.checkedInAt ? formatShortDateTime(t.checkedInAt) : "-",
      t.orderId,
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [header, ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="peserta-${owned.slug}.csv"`,
    },
  });
}
