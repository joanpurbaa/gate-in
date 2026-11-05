"use client";

import { formatRupiah } from "@/lib/money";
import type { SeatMapMode, SeatZoneInfo } from "./types";

interface SeatLegendProps {
  zones: SeatZoneInfo[];
  mode: SeatMapMode;
}

export function SeatLegend({ zones, mode }: SeatLegendProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
      {zones.length > 0 && (
        <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 font-semibold text-stone-500 uppercase tracking-wider">
            Zona:
          </span>
          {zones.map((z) => (
            <span
              key={z.id}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium text-stone-800"
            >
              <span
                className="h-3 w-3 rounded-xs border border-black/15"
                style={{ backgroundColor: z.color }}
              />
              <span>{z.name}</span>
              <span className="font-semibold text-stone-900">{formatRupiah(z.price)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 overflow-x-auto text-xs text-stone-700">
        <span className="shrink-0 font-semibold text-stone-500 uppercase tracking-wider">
          Status:
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 rounded-xs border border-indigo-900/40"
            style={{ backgroundColor: zones[0]?.color ?? "#6366F1" }}
          />
          <span>Tersedia</span>
        </span>

        {mode === "select" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border-2 border-[#3730A3] bg-[#3730A3] text-[9px] font-bold text-white">
              ✓
            </span>
            <span className="font-medium text-[#3730A3]">Pilihan Saya</span>
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
                <rect width="4" height="4" fill="#F59E0B" />
                <line x1="0" y1="0" x2="0" y2="4" stroke="#78350F" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect
              x="1"
              y="1"
              width="14"
              height="14"
              rx="2"
              fill="url(#legend-held-stripes)"
              stroke="#B45309"
              strokeWidth="1"
            />
          </svg>
          <span>Dipesan / Ditahan</span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-stone-500 bg-[#9CA3AF] text-[9px] font-bold text-white">
            ✕
          </span>
          <span>Terjual</span>
        </span>

        {mode === "view" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-green-800 bg-[#16A34A] text-[9px] font-bold text-white">
              ✓
            </span>
            <span className="font-semibold text-green-700">Hadir (Check-in)</span>
          </span>
        )}

        {mode === "edit" && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs border border-dashed border-stone-400 bg-stone-100" />
            <span>Dihapus / Tanpa Zona</span>
          </span>
        )}
      </div>
    </div>
  );
}
