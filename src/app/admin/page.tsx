import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Edit3,
  Eye,
  MapPin,
  Plus,
  QrCode,
  Sparkles,
  Tag,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/ui/StatCard";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

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
      startsAt: ev.startsAt,
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
              className="inline-flex min-h-11 items-center gap-2 rounded-button border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-page shadow-2xs"
            >
              <BarChart3 className="h-4 w-4 text-gate" />
              <span>Analitik Penjualan</span>
            </Link>
            <Link
              href="/admin/promos"
              className="inline-flex min-h-11 items-center gap-2 rounded-button border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-page shadow-2xs"
            >
              <Tag className="h-4 w-4 text-gate" />
              <span>Kode Promo</span>
            </Link>
            <Link
              href="/admin/events/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-button bg-gate px-4 py-2 text-xs font-semibold text-white transition hover:bg-gate-strong shadow-2xs"
            >
              <Plus className="h-4 w-4" />
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

        {/* Daftar Acara */}
        {rows.length === 0 ? (
          <div className="rounded-card border border-line bg-card p-8 sm:p-12 text-center shadow-2xs">
            <Sparkles className="mx-auto h-10 w-10 text-gate" />
            <h2 className="mt-3 font-display text-base sm:text-lg font-bold text-ink">
              Belum ada acara
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-muted">
              Mulai buat acara pertama. Kamu dapat membuat denah kursi dari foto ruangan +
              deskripsi dengan AI maupun memakai template grid atau melingkar.
            </p>
            <Link
              href="/admin/events/new"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-button bg-gate px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-gate-strong shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Buat acara pertama</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((ev) => (
              <div
                key={ev.id}
                className="rounded-card border border-line bg-card p-4 sm:p-5 shadow-2xs transition hover:border-muted/30"
              >
                {/* Baris Atas: Status, Judul, Info Waktu & Tombol Aksi */}
                <div className="flex flex-col gap-3.5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          ev.status === "PUBLISHED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-line bg-page text-muted"
                        }`}
                      >
                        {ev.status === "PUBLISHED" ? "Dipublikasikan" : "Draf"}
                      </span>
                      <h2 className="font-display text-base font-bold text-ink sm:text-lg break-words">
                        {ev.name}
                      </h2>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-gate" />
                        <span>{formatDateTime(ev.startsAt)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-gate" />
                        <span className="truncate max-w-[260px] sm:max-w-none">{ev.venueName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi Acara */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0 shrink-0">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="inline-flex min-h-10 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-button border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-page"
                    >
                      <Eye className="h-3.5 w-3.5 text-gate" />
                      <span>Detail & denah live</span>
                    </Link>
                    {ev.status === "PUBLISHED" && (
                      <Link
                        href={`/admin/events/${ev.id}/checkin`}
                        className="inline-flex min-h-10 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-button bg-seat-checked px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-seat-checked-edge"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Scan check-in</span>
                      </Link>
                    )}
                    <Link
                      href={`/admin/events/${ev.id}/edit`}
                      className="inline-flex min-h-10 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-button border border-line bg-page px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-line/50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{ev.status === "DRAFT" ? "Lanjutkan wizard" : "Ubah"}</span>
                    </Link>
                  </div>
                </div>

                {/* Grid Metrik Acara: 2 kolom di mobile, 3 di tablet (sm), 5 di desktop (lg) */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-line pt-3.5 text-xs">
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted text-[11px]">Terjual</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {ev.soldSeats} / {ev.totalSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted text-[11px]">Sisa tersedia</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {ev.availableSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted text-[11px]">Sedang ditahan</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-amber-700">
                      {ev.heldSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted text-[11px]">Hadir (check-in)</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-seat-checked">
                      {ev.checkedIn} / {ev.soldSeats}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-input bg-page px-3 py-2">
                    <span className="text-muted text-[11px]">Pendapatan</span>
                    <div
                      className="mt-0.5 font-display text-sm font-extrabold text-gate truncate"
                      title={formatRupiah(ev.revenue)}
                    >
                      {formatRupiah(ev.revenue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
