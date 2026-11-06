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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
              Dasbor penyelenggara
            </h1>
            <p className="text-xs text-muted">
              Pantau penjualan kursi, kehadiran peserta, dan kelola denah acara.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/analytics"
              className="inline-flex min-h-12 items-center gap-2 rounded-button border border-line bg-card px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-page sm:min-h-11"
            >
              <BarChart3 className="h-4 w-4 text-gate" />
              <span>Analitik Penjualan</span>
            </Link>
            <Link
              href="/admin/events/new"
              className="inline-flex min-h-12 items-center gap-2 rounded-button bg-gate px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong sm:min-h-11"
            >
              <Plus className="h-4 w-4" />
              <span>Buat acara baru</span>
            </Link>
          </div>
        </div>

        {/* Ringkasan Angka */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {/* Daftar Event */}
        {rows.length === 0 ? (
          <div className="rounded-card border border-line bg-card p-10 text-center">
            <Sparkles className="mx-auto h-9 w-9 text-gate" />
            <h2 className="mt-3 font-display text-base font-bold text-ink">Belum ada acara</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted">
              Mulai buat acara pertama. Kamu dapat membuat denah kursi dari foto ruangan +
              deskripsi dengan AI maupun memakai template grid atau melingkar.
            </p>
            <Link
              href="/admin/events/new"
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-button bg-gate px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong sm:min-h-11"
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
                className="rounded-card border border-line bg-card p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
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
                      <h2 className="font-display text-lg font-bold text-ink">{ev.name}</h2>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gate" />
                        {formatDateTime(ev.startsAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gate" />
                        {ev.venueName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-button border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-page"
                    >
                      <Eye className="h-3.5 w-3.5 text-gate" />
                      <span>Detail & denah live</span>
                    </Link>
                    {ev.status === "PUBLISHED" && (
                      <Link
                        href={`/admin/events/${ev.id}/checkin`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-button bg-seat-checked px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-seat-checked-edge"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Scan check-in</span>
                      </Link>
                    )}
                    <Link
                      href={`/admin/events/${ev.id}/edit`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-button border border-line bg-page px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-line/50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{ev.status === "DRAFT" ? "Lanjutkan wizard" : "Ubah"}</span>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-3.5 text-xs sm:grid-cols-5">
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted">Terjual</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {ev.soldSeats} / {ev.totalSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted">Sisa tersedia</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {ev.availableSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted">Sedang ditahan</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-amber-700">
                      {ev.heldSeats}
                    </div>
                  </div>
                  <div className="rounded-input bg-page px-3 py-2">
                    <span className="text-muted">Hadir (check-in)</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-seat-checked">
                      {ev.checkedIn} / {ev.soldSeats}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-input bg-page px-3 py-2 sm:col-span-1">
                    <span className="text-muted">Pendapatan</span>
                    <div className="mt-0.5 font-display text-sm font-extrabold text-gate">
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
