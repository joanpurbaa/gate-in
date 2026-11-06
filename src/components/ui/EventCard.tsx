import Link from "next/link";
import { formatPriceRange } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { PosterImage } from "./PosterImage";
import { StatusPill, type SaleState } from "./StatusPill";

export interface EventCardData {
  slug: string;
  name: string;
  description: string;
  posterUrl: string | null;
  venueName: string;
  startsAt: Date | string;
  prices: number[];
  totalSeats: number;
  availableSeats: number;
  layoutType: "grid" | "circle" | null;
  saleState: SaleState;
}

export function EventCard({ event }: { event: EventCardData }) {
  const isMutedState = event.saleState !== "OPEN";
  const isLowStock =
    event.saleState === "OPEN" &&
    event.totalSeats > 0 &&
    event.availableSeats / event.totalSeats < 0.25;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-card transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/e/${event.slug}`} className="relative block overflow-hidden">
        <PosterImage
          src={event.posterUrl}
          alt={event.name}
          slug={event.slug}
          fallbackTitleSize={event.posterUrl ? "md" : "none"}
          imgClassName={`transition duration-500 group-hover:scale-103 ${
            isMutedState ? "grayscale-60" : ""
          }`}
        />
        <div className="absolute top-3 left-3">
          <StatusPill state={event.saleState} />
        </div>
      </Link>

      {/* Garis sobekan karcis bertakik di kedua sisi */}
      <div className="relative flex items-center justify-between py-1">
        <span
          aria-hidden="true"
          className="-ml-2.5 h-5 w-5 rounded-full border border-line bg-page"
        />
        <div className="flex-1 border-t border-dashed border-line" />
        <span
          aria-hidden="true"
          className="-mr-2.5 h-5 w-5 rounded-full border border-line bg-page"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between px-4 pt-2 pb-4 sm:px-5 sm:pb-5">
        <div>
          <Link href={`/e/${event.slug}`}>
            <h3 className="line-clamp-2 font-display text-lg font-bold tracking-tight text-ink transition group-hover:text-gate">
              {event.name}
            </h3>
          </Link>

          <p className="mt-1.5 truncate text-xs text-muted">
            {formatDateTime(event.startsAt)} • {event.venueName}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 pt-3">
          <div>
            <span className="block text-xs text-muted">Mulai dari</span>
            <span className="font-display text-base font-extrabold text-ink">
              {formatPriceRange(event.prices)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLowStock && (
              <span className="rounded-full bg-ticket px-2.5 py-1 text-xs font-semibold text-ink">
                Sisa {event.availableSeats}
              </span>
            )}
            <Link
              href={`/e/${event.slug}`}
              className="inline-flex min-h-10 items-center justify-center rounded-button bg-gate px-4 py-2 text-xs font-semibold text-white transition hover:bg-gate-strong"
            >
              Pilih kursi
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
