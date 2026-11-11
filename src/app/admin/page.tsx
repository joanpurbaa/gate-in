import Link from "next/link";
import {
  BarChart3,
  Plus,
  Tag,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/ui/StatCard";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { AdminEventsList } from "./AdminEventsList";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireAdminPageSession();
  const now = new Date();

  const events = await prisma.event.findMany({
    where: { organizerId: session.organizerId },
    orderBy: { createdAt: "desc" },
    include: {
      seats: {
        select: {
          status: true,
          heldUntil: true,
        },
      },
      orders: {
        where: { status: "PAID" },
        select: { totalAmount: true },
      },
      tickets: {
        select: { status: true },
      },
    },
  });

  const rows = events.map((ev) => {
    const totalSeats = ev.seats.length;
    const soldSeats = ev.seats.filter((s) => s.status === "SOLD").length;
    const heldSeats = ev.seats.filter(
      (s) => s.status === "HELD" && s.heldUntil && s.heldUntil > now
    ).length;
    const availableSeats = totalSeats - soldSeats - heldSeats;
    const checkedIn = ev.tickets.filter((t) => t.status === "USED").length;
    const revenue = ev.orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      venueName: ev.venueName,
      startsAt: ev.startsAt.toISOString(),
      status: ev.status,
      totalSeats,
      soldSeats,
      heldSeats,
      availableSeats,
      checkedIn,
      revenue,
    };
  });

  const totalSoldAll = rows.reduce((sum, r) => sum + r.soldSeats, 0);
  const totalCheckedInAll = rows.reduce((sum, r) => sum + r.checkedIn, 0);
  const totalRevenueAll = rows.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div className="min-h-screen bg-page">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        {/* Header Dasbor & Aksi Cepat */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl md:text-3xl">
              Dasbor penyelenggara
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted">
              Pantau penjualan kursi, kehadiran peserta, dan kelola denah acara.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/analytics"
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink whitespace-nowrap shrink-0 transition hover:bg-page shadow-2xs"
            >
              <BarChart3 className="h-4 w-4 text-gate shrink-0" />
              <span>Analitik Penjualan</span>
            </Link>
            <Link
              href="/admin/promos"
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink whitespace-nowrap shrink-0 transition hover:bg-page shadow-2xs"
            >
              <Tag className="h-4 w-4 text-gate shrink-0" />
              <span>Kode Promo</span>
            </Link>
            <Link
              href="/admin/events/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-button bg-gate px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition hover:bg-gate-strong shadow-2xs"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Buat acara baru</span>
            </Link>
          </div>
        </div>

        {/* Ringkasan Angka Utama: 2 kolom di mobile/tablet, 4 kolom di desktop lebar */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total acara"
            value={rows.length}
            sublabel={`${rows.filter((r) => r.status === "PUBLISHED").length} dipublikasikan`}
          />
          <StatCard
            label="Tiket terjual"
            value={totalSoldAll}
            sublabel="Kursi berstatus SOLD"
            tone="indigo"
          />
          <StatCard
            label="Peserta hadir"
            value={totalCheckedInAll}
            sublabel="Sudah scan QR check-in"
            tone="green"
          />
          <StatCard
            label="Total pendapatan"
            value={formatRupiah(totalRevenueAll)}
            sublabel="Pesanan berstatus PAID"
          />
        </div>

        {/* Daftar Acara Interaktif dengan Fitur Search & Filter */}
        <AdminEventsList events={rows} />
      </main>
    </div>
  );
}
