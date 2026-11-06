import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { getSalesPerformanceAnalytics } from "@/lib/analytics/service";
import { prisma } from "@/lib/db";
import { formatShortDateTime } from "@/lib/time";
import type { AnalyticsPeriod } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * Sanitasi nilai sel CSV dari injeksi formula (=, +, -, @, tab, CR)
 * dan bungkus dengan tanda kutip ganda.
 */
function csvCell(val: string | number | null | undefined): string {
  const raw = val == null ? "" : String(val);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const eventId = searchParams.get("eventId") || undefined;
  const period = (searchParams.get("period") as AnalyticsPeriod) || "30d";
  const type = searchParams.get("type") || "sales-summary";

  let targetEventSlug = "semua-acara";
  if (eventId) {
    const owned = await getOwnedEventOrNull(eventId, session.organizerId);
    if (!owned) {
      return NextResponse.json({ error: "Acara tidak ditemukan" }, { status: 404 });
    }
    targetEventSlug = owned.slug;
  }

  try {
    const analytics = await getSalesPerformanceAnalytics(session.organizerId, {
      eventId,
      period,
      granularity: "daily",
    });

    if (type === "zone-performance") {
      const header = [
        "Nama Zona",
        "Acara",
        "Harga Kursi (Rp)",
        "Total Kuota",
        "Tiket Terjual",
        "Sisa Kuota",
        "Gross Revenue (Rp)",
        "Kontribusi Pendapatan (%)",
        "Tingkat Keterisian (%)",
      ]
        .map(csvCell)
        .join(",");

      const rows = analytics.zones.map((z) =>
        [
          z.zoneName,
          z.eventName,
          z.price,
          z.totalQuota,
          z.ticketsSold,
          z.availableQuota,
          z.revenue,
          `${z.revenueShare}%`,
          `${z.occupancyRate}%`,
        ]
          .map(csvCell)
          .join(",")
      );

      const csv = [header, ...rows].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="performa-zona-${targetEventSlug}-${period}.csv"`,
        },
      });
    }

    if (type === "attendance") {
      const tickets = await prisma.ticket.findMany({
        where: {
          event: { organizerId: session.organizerId },
          ...(eventId ? { eventId } : {}),
          order: { status: "PAID" },
        },
        include: {
          event: { select: { name: true } },
          seat: { include: { zone: true } },
          order: { select: { buyerName: true, buyerPhone: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const header = [
        "Kode Tiket",
        "Nama Acara",
        "Kursi",
        "Zona",
        "Harga (Rp)",
        "Nama Peserta",
        "Nomor WhatsApp",
        "Status Kehadiran",
        "Waktu Check-in (WIB)",
        "Pintu / Checker",
      ]
        .map(csvCell)
        .join(",");

      const rows = tickets.map((t) =>
        [
          t.code,
          t.event.name,
          t.seat.label,
          t.seat.zone?.name ?? "Reguler",
          t.seat.zone?.price ?? 0,
          t.order.buyerName,
          t.order.buyerPhone,
          t.status === "USED" ? "HADIR" : "BELUM CHECK-IN",
          t.checkedInAt ? formatShortDateTime(t.checkedInAt) : "-",
          t.checkedInBy || "Pintu Utama",
        ]
          .map(csvCell)
          .join(",")
      );

      const csv = [header, ...rows].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="laporan-kehadiran-${targetEventSlug}.csv"`,
        },
      });
    }

    // Default: Sales Summary
    const header = [
      "Tanggal",
      "Tiket Terjual",
      "Transaksi Berhasil",
      "Gross Revenue (Rp)",
      "Rata-rata per Transaksi (Rp)",
    ]
      .map(csvCell)
      .join(",");

    const rows = analytics.salesTrend.map((t) => {
      const aov = t.orderCount > 0 ? Math.round(t.revenue / t.orderCount) : 0;
      return [t.label, t.ticketCount, t.orderCount, t.revenue, aov]
        .map(csvCell)
        .join(",");
    });

    const csv = [header, ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ringkasan-penjualan-${targetEventSlug}-${period}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengekspor data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
