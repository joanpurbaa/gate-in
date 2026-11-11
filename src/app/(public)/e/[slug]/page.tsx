import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  MapPin,
  Phone,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import { PosterImage } from "@/components/ui/PosterImage";
import { StatusPill, computeSaleState } from "@/components/ui/StatusPill";
import { EventDetailWaitingList } from "@/components/waiting-list/EventDetailWaitingList";
import { getCachedEventDetail } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { formatPriceRange, formatRupiah } from "@/lib/money";
import { formatDateTime, formatShortDateTime, formatTimeRange } from "@/lib/time";

// Revalidasi data acara berkala maksimal tiap 30 detik (ISR)
export const revalidate = 30;

export async function generateStaticParams() {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    return events.map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getCachedEventDetail(slug);

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  const now = new Date();
  const isAvailable = (s: { status: string; heldUntil: Date | string | null }) =>
    s.status === "AVAILABLE" ||
    (s.status === "HELD" && (!s.heldUntil || new Date(s.heldUntil) <= now));

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
    <main className="mx-auto max-w-[1100px] px-4 py-6 pb-28 sm:py-8 sm:pb-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Kembali ke daftar acara</span>
      </Link>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-card">
        <PosterImage
          src={event.posterUrl}
          alt={event.name}
          slug={event.slug}
          priority
          sizes="(max-width: 1100px) 100vw, 1100px"
          fallbackTitleSize="lg"
        />

        <div className="p-5 sm:p-7">
          <div className="mb-4">
            <StatusPill state={saleState} />
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {event.name}
            </h1>
          </div>

          <p className="max-w-[70ch] text-sm leading-relaxed whitespace-pre-line text-ink">
            {event.description}
          </p>

          {/* Info Jadwal & Lokasi */}
          <div className="mt-6 grid grid-cols-1 gap-3.5 rounded-input border border-line bg-page p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
              <div>
                <div className="text-xs font-medium text-muted">Tanggal & waktu acara</div>
                <div className="text-sm font-semibold text-ink">
                  {formatDateTime(event.startsAt)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
              <div>
                <div className="text-xs font-medium text-muted">Jam open gate</div>
                <div className="text-sm font-semibold text-ink">
                  {formatTimeRange(event.gateOpenAt, event.gateCloseAt)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
              <div>
                <div className="text-xs font-medium text-muted">Lokasi venue</div>
                <div className="text-sm font-semibold text-ink">{event.venueName}</div>
                {event.venueAddress && (
                  <div className="text-xs text-muted">{event.venueAddress}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
              <div>
                <div className="text-xs font-medium text-muted">Periode penjualan tiket</div>
                <div className="text-xs font-semibold text-ink">
                  {formatShortDateTime(event.salesOpenAt)} –{" "}
                  {formatShortDateTime(event.salesCloseAt)}
                </div>
                <div className="text-xs text-muted">
                  Maksimal {event.maxSeatsPerOrder} kursi per pesanan
                </div>
              </div>
            </div>
          </div>

          {/* Daftar Kategori / Zona Kursi */}
          <div className="mt-6">
            <h2 className="font-display text-lg font-bold text-ink">
              Zona & ketersediaan kursi
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Posisi tiap kursi dapat kamu pilih langsung pada denah di langkah berikutnya.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {zoneStats.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center justify-between rounded-input border border-line bg-card p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-9 w-9 shrink-0 rounded-lg border border-ink/10"
                      style={{ backgroundColor: z.color }}
                    />
                    <div>
                      <div className="text-sm font-bold text-ink">{z.name}</div>
                      <div className="text-xs text-muted">
                        <strong className="font-semibold text-ink">{z.available}</strong> dari{" "}
                        {z.total} tersedia
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-extrabold text-ink">
                      {formatRupiah(z.price)}
                    </div>
                    <div className="text-xs text-muted">per kursi</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Integrasi Smart Waiting List */}
            <EventDetailWaitingList
              event={{
                id: event.id,
                slug: event.slug,
                name: event.name,
                maxSeatsPerOrder: event.maxSeatsPerOrder,
              }}
              zones={zoneStats}
              isSoldOut={saleState === "SOLD_OUT"}
            />
          </div>

          {/* Catatan & Kontak */}
          {(event.policyNote || event.contactInfo) && (
            <div className="mt-6 space-y-2 rounded-input border border-line bg-page p-4 text-xs text-ink">
              {event.policyNote && (
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <p>{event.policyNote}</p>
                </div>
              )}
              {event.contactInfo && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <p className="font-medium">{event.contactInfo}</p>
                </div>
              )}
            </div>
          )}

          {/* CTA Desktop */}
          <div className="mt-7 hidden items-center justify-between border-t border-line pt-5 sm:flex">
            <div>
              <span className="text-xs text-muted">Mulai dari</span>
              <div className="font-display text-lg font-extrabold text-ink">
                {formatPriceRange(event.zones.map((z) => z.price))}
              </div>
            </div>

            {saleState === "OPEN" ? (
              <Link
                href={`/e/${event.slug}/beli`}
                className="inline-flex min-h-12 items-center justify-center rounded-button bg-gate px-6 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong"
              >
                Pilih kursi
              </Link>
            ) : (
              <div className="inline-flex min-h-12 items-center gap-2 rounded-button bg-line px-5 py-3 text-xs font-semibold text-muted">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  {saleState === "UPCOMING"
                    ? "Belum dibuka"
                    : saleState === "SOLD_OUT"
                      ? "Habis terjual"
                      : "Penjualan ditutup"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA untuk HP */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xs sm:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <span className="block text-xs text-muted">Mulai dari</span>
            <span className="font-display text-sm font-extrabold text-ink">
              {formatPriceRange(event.zones.map((z) => z.price))}
            </span>
          </div>
          {saleState === "OPEN" ? (
            <Link
              href={`/e/${event.slug}/beli`}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Pilih kursi
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="min-h-12 flex-1 rounded-button bg-line px-4 py-3 text-xs font-semibold text-muted"
            >
              {saleState === "UPCOMING"
                ? "Belum dibuka"
                : saleState === "SOLD_OUT"
                  ? "Habis terjual"
                  : "Penjualan ditutup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
