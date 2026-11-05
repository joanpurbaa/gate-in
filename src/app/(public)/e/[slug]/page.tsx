import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Info,
  MapPin,
  Phone,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import { StatusPill, computeSaleState } from "@/components/ui/StatusPill";
import { prisma } from "@/lib/db";
import { formatPriceRange, formatRupiah } from "@/lib/money";
import { formatDateTime, formatShortDateTime, formatTimeRange } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      seats: {
        select: {
          zoneId: true,
          status: true,
          heldUntil: true,
        },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  const now = new Date();
  const isAvailable = (s: { status: string; heldUntil: Date | null }) =>
    s.status === "AVAILABLE" || (s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now));

  const totalSeats = event.seats.length;
  const availableSeats = event.seats.filter(isAvailable).length;
  const saleState = computeSaleState({
    salesOpenAt: event.salesOpenAt,
    salesCloseAt: event.salesCloseAt,
    availableCount: availableSeats,
    now,
  });

  const zoneStats = event.zones.map((z) => {
    const zoneSeats = event.seats.filter((s) => s.zoneId === z.id);
    const avail = zoneSeats.filter(isAvailable).length;
    return {
      ...z,
      total: zoneSeats.length,
      available: avail,
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:py-8 sm:pb-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Kembali ke Daftar Acara</span>
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        {event.posterUrl ? (
          <div className="aspect-[16/8] w-full overflow-hidden bg-stone-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.posterUrl} alt={event.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex flex-col justify-between bg-stone-900 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPill state={saleState} />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs text-stone-200">
                Kapasitas {totalSeats} Kursi • Sisa {availableSeats}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Summarecon Mall Bandung
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{event.name}</h1>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-7">
          {event.posterUrl && (
            <div className="mb-4">
              <StatusPill state={saleState} />
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {event.name}
              </h1>
            </div>
          )}

          <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-line">
            {event.description}
          </p>

          {/* Info Jadwal & Lokasi */}
          <div className="mt-6 grid grid-cols-1 gap-3.5 rounded-xl border border-stone-200 bg-[#FAFAF7] p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
              <div>
                <div className="text-xs font-semibold text-stone-500">Tanggal & Waktu Acara</div>
                <div className="text-sm font-bold text-stone-900">
                  {formatDateTime(event.startsAt)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
              <div>
                <div className="text-xs font-semibold text-stone-500">Jam Open Gate (Check-in)</div>
                <div className="text-sm font-bold text-stone-900">
                  {formatTimeRange(event.gateOpenAt, event.gateCloseAt)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
              <div>
                <div className="text-xs font-semibold text-stone-500">Lokasi Venue</div>
                <div className="text-sm font-bold text-stone-900">{event.venueName}</div>
                {event.venueAddress && (
                  <div className="text-xs text-stone-600">{event.venueAddress}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
              <div>
                <div className="text-xs font-semibold text-stone-500">Periode Penjualan Tiket</div>
                <div className="text-xs font-semibold text-stone-900">
                  {formatShortDateTime(event.salesOpenAt)} –{" "}
                  {formatShortDateTime(event.salesCloseAt)}
                </div>
                <div className="text-[11px] text-stone-600">
                  Maksimal {event.maxSeatsPerOrder} kursi per pesanan
                </div>
              </div>
            </div>
          </div>

          {/* Daftar Kategori / Zona Kursi */}
          <div className="mt-6">
            <h2 className="text-base font-bold text-stone-900">Kategori Zona & Ketersediaan Kursi</h2>
            <p className="mt-0.5 text-xs text-stone-600">
              Posisi tiap bangku dapat Anda pilih langsung pada denah di langkah berikutnya.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {zoneStats.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-9 w-9 shrink-0 rounded-lg border border-black/10"
                      style={{ backgroundColor: z.color }}
                    />
                    <div>
                      <div className="text-sm font-bold text-stone-900">{z.name}</div>
                      <div className="text-xs text-stone-600">
                        Tersedia{" "}
                        <strong className="font-semibold text-stone-900">{z.available}</strong> /{" "}
                        {z.total} kursi
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-stone-900">{formatRupiah(z.price)}</div>
                    <div className="text-[11px] text-stone-500">per kursi</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan & Kontak */}
          {(event.policyNote || event.contactInfo) && (
            <div className="mt-6 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700">
              {event.policyNote && (
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <p>{event.policyNote}</p>
                </div>
              )}
              {event.contactInfo && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <p className="font-medium">{event.contactInfo}</p>
                </div>
              )}
            </div>
          )}

          {/* CTA Desktop */}
          <div className="mt-7 hidden items-center justify-between border-t border-stone-200 pt-5 sm:flex">
            <div>
              <span className="text-xs text-stone-500">Rentang Harga Tiket</span>
              <div className="text-lg font-bold text-stone-900">
                {formatPriceRange(event.zones.map((z) => z.price))}
              </div>
            </div>

            {saleState === "OPEN" ? (
              <Link
                href={`/e/${event.slug}/beli`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#3730A3] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900"
              >
                <span>Beli Tiket & Pilih Kursi</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-200 px-5 py-3 text-xs font-semibold text-stone-600">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  {saleState === "UPCOMING"
                    ? "Penjualan Belum Dibuka"
                    : saleState === "SOLD_OUT"
                      ? "Tiket Habis Terjual"
                      : "Penjualan Sudah Ditutup"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA untuk HP */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xs sm:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] text-stone-500">Mulai dari</span>
            <span className="text-sm font-bold text-stone-900">
              {formatPriceRange(event.zones.map((z) => z.price))}
            </span>
          </div>
          {saleState === "OPEN" ? (
            <Link
              href={`/e/${event.slug}/beli`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs"
            >
              <span>Beli Tiket & Pilih Kursi</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="min-h-12 flex-1 rounded-xl bg-stone-200 px-4 py-3 text-xs font-semibold text-stone-500"
            >
              {saleState === "UPCOMING"
                ? "Penjualan Belum Dibuka"
                : saleState === "SOLD_OUT"
                  ? "Habis Terjual"
                  : "Penjualan Ditutup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
