import Link from "next/link";
import { Calendar, MapPin, Armchair, ArrowRight } from "lucide-react";
import { formatPriceRange } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
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
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/e/${event.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-stone-900">
        {event.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.posterUrl}
            alt={event.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-stone-900 p-5 text-white">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="font-mono uppercase tracking-wider text-indigo-300">
                {event.layoutType === "circle" ? "Denah Melingkar 360°" : "Denah Grid Presisi"}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium">
                {event.totalSeats} Kursi
              </span>
            </div>
            {/* Ilustrasi siluet denah kursi */}
            <div className="my-auto flex items-center justify-center py-2 opacity-80">
              {event.layoutType === "circle" ? (
                <svg className="h-20 w-20 text-indigo-400" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="14" fill="#3730A3" />
                  <circle
                    cx="50"
                    cy="50"
                    r="26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="6 5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="4"
                    strokeDasharray="6 5"
                  />
                </svg>
              ) : (
                <svg className="h-20 w-36 text-indigo-400" viewBox="0 0 160 90" aria-hidden="true">
                  <rect x="35" y="6" width="90" height="12" rx="3" fill="#3730A3" />
                  {Array.from({ length: 4 }).map((_, r) =>
                    Array.from({ length: 8 }).map((__, c) => (
                      <rect
                        key={`${r}-${c}`}
                        x={16 + c * 16 + (c >= 4 ? 8 : 0)}
                        y={28 + r * 14}
                        width="10"
                        height="9"
                        rx="2"
                        fill={r === 0 ? "#818CF8" : "#38BDF8"}
                      />
                    ))
                  )}
                </svg>
              )}
            </div>
            <div className="text-[11px] text-stone-400">Summarecon Mall Bandung</div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusPill state={event.saleState} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <Link href={`/e/${event.slug}`}>
            <h2 className="text-lg font-bold tracking-tight text-stone-900 group-hover:text-[#3730A3]">
              {event.name}
            </h2>
          </Link>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600">
            {event.description}
          </p>

          <dl className="mt-3.5 space-y-1.5 text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
              <dd className="font-medium">{formatDateTime(event.startsAt)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
              <dd className="truncate">{event.venueName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Armchair className="h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
              <dd>
                Tersedia{" "}
                <strong className="font-semibold text-stone-900">{event.availableSeats}</strong> dari{" "}
                {event.totalSeats} kursi
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3.5">
          <div>
            <span className="block text-[11px] text-stone-500">Mulai dari</span>
            <span className="text-sm font-bold text-stone-900">
              {formatPriceRange(event.prices)}
            </span>
          </div>

          <Link
            href={`/e/${event.slug}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#3730A3] px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-900"
          >
            <span>Lihat & Pilih Kursi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
