import Link from "next/link";
import {
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
    <div className="min-h-screen bg-[#FAFAF7]">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">
              Dashboard Penyelenggara
            </h1>
            <p className="text-xs text-stone-600">
              Pantau penjualan kursi, kehadiran peserta, dan kelola layout acara Anda.
            </p>
          </div>

          <Link
            href="/admin/events/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3730A3] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-900"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Acara Baru (AI / Manual Layout)</span>
          </Link>
        </div>

        {/* Ringkasan Angka */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Acara"
            value={rows.length}
            sublabel={`${rows.filter((r) => r.status === "PUBLISHED").length} dipublikasikan`}
          />
          <StatCard
            label="Tiket Terjual"
            value={totalSoldAll}
            sublabel="Kursi berstatus SOLD"
            tone="indigo"
          />
          <StatCard
            label="Peserta Hadir"
            value={totalCheckedInAll}
            sublabel="Sudah scan QR check-in"
            tone="green"
          />
          <StatCard
            label="Total Pendapatan"
            value={formatRupiah(totalRevenueAll)}
            sublabel="Pesanan berstatus PAID"
          />
        </div>

        {/* Daftar Event */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-xs">
            <Sparkles className="mx-auto h-9 w-9 text-[#3730A3]" />
            <h2 className="mt-3 text-base font-bold text-stone-900">Belum Ada Acara</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-stone-600">
              Mulai buat acara pertama Anda. Anda dapat membuat denah kursi dari foto ruangan +
              deskripsi dengan AI maupun memakai template Grid/Melingkar.
            </p>
            <Link
              href="/admin/events/new"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3730A3] px-5 py-2.5 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Acara Pertama</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((ev) => (
              <div
                key={ev.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          ev.status === "PUBLISHED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-stone-300 bg-stone-100 text-stone-700"
                        }`}
                      >
                        {ev.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
                      </span>
                      <h2 className="text-lg font-bold text-stone-900">{ev.name}</h2>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#3730A3]" />
                        {formatDateTime(ev.startsAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#3730A3]" />
                        {ev.venueName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#3730A3]" />
                      <span>Detail & Denah Live</span>
                    </Link>
                    {ev.status === "PUBLISHED" && (
                      <Link
                        href={`/admin/events/${ev.id}/checkin`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Scan Check-in</span>
                      </Link>
                    )}
                    <Link
                      href={`/admin/events/${ev.id}/edit`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span> {ev.status === "DRAFT" ? "Lanjutkan Wizard" : "Ubah"}</span>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-stone-100 pt-3.5 text-xs sm:grid-cols-5">
                  <div className="rounded-xl bg-[#FAFAF7] px-3 py-2">
                    <span className="text-stone-500">Terjual</span>
                    <div className="mt-0.5 font-mono text-sm font-bold text-stone-900">
                      {ev.soldSeats} / {ev.totalSeats}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#FAFAF7] px-3 py-2">
                    <span className="text-stone-500">Sisa Tersedia</span>
                    <div className="mt-0.5 font-mono text-sm font-bold text-stone-900">
                      {ev.availableSeats}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#FAFAF7] px-3 py-2">
                    <span className="text-stone-500">Sedang Ditahan</span>
                    <div className="mt-0.5 font-mono text-sm font-bold text-amber-700">
                      {ev.heldSeats}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50/70 px-3 py-2">
                    <span className="text-green-800">Hadir (Check-in)</span>
                    <div className="mt-0.5 font-mono text-sm font-bold text-green-800">
                      {ev.checkedIn} / {ev.soldSeats}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl bg-indigo-50/60 px-3 py-2 sm:col-span-1">
                    <span className="text-indigo-900">Pendapatan</span>
                    <div className="mt-0.5 font-mono text-sm font-bold text-[#3730A3]">
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
