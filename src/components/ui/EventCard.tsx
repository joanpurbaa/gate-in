import Link from "next/link";
import clsx from "clsx";
import { formatPriceRange } from "@/lib/money";
import { formatDayNumber, formatShortMonth } from "@/lib/time";
import { getCategoryInfo } from "@/components/icons/categories";
import { PosterImage } from "./PosterImage";
import { StatusPill, type SaleState } from "./StatusPill";

export interface EventCardData {
  slug: string;
  name: string;
  description: string;
  posterUrl: string | null;
  venueName: string;
  organizerName?: string | null;
  category?: string | null;
  startsAt: Date | string;
  prices: number[];
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  layoutType: "grid" | "circle" | null;
  saleState: SaleState;
  isFeatured?: boolean;
}

export function EventCard({
  event,
  className,
}: {
  event: EventCardData;
  className?: string;
}) {
  const isMutedState = event.saleState !== "OPEN";
  const isLowStock =
    event.saleState === "OPEN" &&
    event.totalSeats > 0 &&
    event.availableSeats / event.totalSeats < 0.25;

  const categoryInfo = getCategoryInfo(event.category);
  const dayNumber = formatDayNumber(event.startsAt);
  const shortMonth = formatShortMonth(event.startsAt);

  return (
    <article
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-[20px] border border-line bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <Link href={`/e/${event.slug}`} className="flex flex-1 flex-col">
        {/* Atas: Poster 16:9 */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink">
          <PosterImage
            src={event.posterUrl}
            alt={event.name}
            slug={event.slug}
            fallbackTitleSize={event.posterUrl ? "md" : "none"}
            imgClassName={clsx(
              "transition duration-500 group-hover:scale-103",
              isMutedState && "grayscale-[60%] opacity-85"
            )}
          />

          {/* Kiri atas: Pil kategori atau Status Penjualan jika tidak OPEN */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            {isMutedState ? (
              <StatusPill state={event.saleState} />
            ) : categoryInfo ? (
              <span className="inline-flex items-center rounded-full bg-sand/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink backdrop-blur-sm">
                {categoryInfo.shortName}
              </span>
            ) : null}
          </div>

          {/* Kanan atas: Lencana tanggal (hari besar, bulan kecil) */}
          <div className="absolute top-3 right-3 flex flex-col items-center justify-center rounded-xl border border-line/40 bg-card/95 px-2.5 py-1 text-center shadow-xs backdrop-blur-sm">
            <span className="font-display text-sm font-extrabold leading-none text-ink">
              {dayNumber}
            </span>
            <span className="text-[10px] font-bold tracking-wider text-muted">
              {shortMonth}
            </span>
          </div>
        </div>

        {/* Garis pemisah putus-putus dengan takik karcis setengah lingkaran di kiri & kanan */}
        <div className="relative flex items-center justify-between py-0.5">
          <span
            aria-hidden="true"
            className="-ml-3 h-6 w-6 rounded-full border border-line bg-page shadow-inner"
          />
          <div className="flex-1 border-t border-dashed border-line" />
          <span
            aria-hidden="true"
            className="-mr-3 h-6 w-6 rounded-full border border-line bg-page shadow-inner"
          />
        </div>

        {/* Bawah: Rincian acara */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            <h3 className="line-clamp-2 font-display text-base font-bold tracking-tight text-ink transition group-hover:text-gate sm:text-lg">
              {event.name}
            </h3>

            {event.organizerName && (
              <p className="mt-1 truncate text-xs font-medium text-stone">
                {event.organizerName}
              </p>
            )}

            <p className="mt-0.5 truncate text-xs text-muted">
              {event.venueName}
            </p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/60 pt-3">
            <div>
              <span className="block text-[11px] text-muted">Mulai dari</span>
              <span className="font-display text-base font-extrabold text-ink">
                {formatPriceRange(event.prices)}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1">
              {isLowStock ? (
                <span className="inline-flex items-center rounded-full bg-ticket px-2.5 py-0.5 text-xs font-semibold text-ink">
                  Sisa {event.availableSeats}
                </span>
              ) : event.soldSeats > 0 ? (
                <span className="text-[11px] text-muted">
                  {event.soldSeats} tiket terjual
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
