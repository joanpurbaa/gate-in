"use client";

import { formatRupiah } from "@/lib/money";
import type { SeatMapMode, SeatZoneInfo } from "./types";

interface SeatLegendProps {
  zones: SeatZoneInfo[];
  mode: SeatMapMode;
}

export function SeatLegend({ zones, mode }: SeatLegendProps) {
  return (
    <div className="rounded-input border border-line bg-card p-3">
      {zones.length > 0 && (
        <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 font-semibold text-muted">Zona:</span>
          {zones.map((z) => (
            <span
              key={z.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 font-medium text-ink"
            >
              <span
                className="h-3 w-3 rounded-xs border border-ink/20"
                style={{ backgroundColor: z.color }}
              />
              <span>{z.name}</span>
              <span className="font-semibold text-ink">{formatRupiah(z.price)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3.5 overflow-x-auto text-xs text-ink">
        <span className="shrink-0 font-semibold text-muted">Status:</span>

        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-xs border-2 border-ink bg-card" />
          <span>Tersedia (warna sesuai zona)</span>
        </span>

        {mode === "select" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs bg-ink text-xs font-bold leading-none text-white ring-2 ring-ink ring-offset-1">
              ✓
            </span>
            <span className="font-semibold text-ink">Dipilih saya</span>
          </span>
        )}

        <span className="inline-flex shrink-0 items-center gap-1.5">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
            <defs>
              <pattern
                id="legend-held-stripes"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="4" height="4" fill="var(--color-seat-held)" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="4"
                  stroke="var(--color-seat-held-stripe)"
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>
            <rect
              x="1"
              y="1"
              width="14"
              height="14"
              rx="2"
              fill="url(#legend-held-stripes)"
              stroke="var(--color-seat-held-edge)"
              strokeWidth="1"
            />
          </svg>
          <span>Dipesan / ditahan</span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-seat-sold-edge bg-seat-sold text-xs font-bold leading-none text-white">
            ✕
          </span>
          <span>Terjual</span>
        </span>

        {mode === "view" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-seat-checked-edge bg-seat-checked text-xs font-bold leading-none text-white">
              ✓
            </span>
            <span className="font-semibold text-seat-checked">Hadir (check-in)</span>
          </span>
        )}

        {mode === "edit" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs border border-dashed border-seat-void-edge bg-seat-void" />
            <span>Dihapus / tanpa zona</span>
          </span>
        )}
      </div>
    </div>
  );
}
