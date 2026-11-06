import React from "react";
import Link from "next/link";
import type { LayoutV1 } from "@/lib/layout/types";
import { SeatMap } from "@/components/seatmap/SeatMap";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";

export interface ExplainerBandProps {
  layout: LayoutV1 | null;
  seats: SeatMapItem[];
  zones: SeatZoneInfo[];
  eventSlug: string;
  eventName: string;
}

export function ExplainerBand({
  layout,
  seats,
  zones,
  eventSlug,
  eventName,
}: ExplainerBandProps) {
  if (!layout) return null;

  return (
    <section
      aria-label="Penjelasan denah kursi"
      className="my-10 rounded-[20px] border border-line bg-card p-6 sm:p-10"
    >
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Kiri: Teks penjelas 2 kalimat */}
        <div className="lg:col-span-5">
          <span className="inline-flex items-center rounded-full bg-gate/10 px-3 py-1 text-xs font-semibold text-gate">
            Denah 1:1 Nyata
          </span>

          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Lihat kursimu sebelum bayar.
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Denah di sini sama dengan susunan kursi di ruangan. Kamu tahu persis
            posisi panggung, jarak ke lorong, dan sudut pandang sebelum memesan tiket.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <Link
              href={`/e/${eventSlug}/beli`}
              className="inline-flex min-h-12 items-center justify-center rounded-button bg-gate px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gate-strong"
            >
              Coba pilih kursi
            </Link>
            <span className="text-xs text-muted">
              Di {eventName}
            </span>
          </div>
        </div>

        {/* Kanan: Cuplikan Denah Asli (mode view) */}
        <div className="relative overflow-hidden rounded-[16px] border border-line bg-page p-2 sm:p-4 lg:col-span-7">
          <div className="pointer-events-none h-[320px] w-full overflow-hidden sm:h-[380px]">
            <SeatMap
              layout={layout}
              seats={seats}
              zones={zones}
              mode="view"
              showLegend={false}
              className="h-full w-full"
            />
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-muted">
            <span>Pratinjau denah asli (mode intip)</span>
            <span>Geser & perbesar denah aktif saat memilih tiket</span>
          </div>
        </div>
      </div>
    </section>
  );
}
