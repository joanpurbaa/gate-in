"use client";

import { ArrowRight, X } from "lucide-react";
import { formatRupiah } from "@/lib/money";

export interface SelectedSeatSummary {
  label: string;
  zoneName: string;
  zoneColor: string;
  price: number;
}

interface SelectedSeatsBarProps {
  selected: SelectedSeatSummary[];
  maxSeats: number;
  loading?: boolean;
  ctaLabel?: string;
  onRemoveSeat: (label: string) => void;
  onSubmit: () => void;
}

export function SelectedSeatsBar({
  selected,
  maxSeats,
  loading = false,
  ctaLabel = "Lanjut ke Ringkasan",
  onRemoveSeat,
  onSubmit,
}: SelectedSeatsBarProps) {
  const total = selected.reduce((acc, s) => acc + s.price, 0);

  return (
    <div className="sticky bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xs">
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs text-stone-600 sm:justify-start sm:gap-3">
            <span>
              Kursi dipilih:{" "}
              <strong className="font-semibold text-stone-900">
                {selected.length}/{maxSeats}
              </strong>
            </span>
            <span className="text-sm font-bold text-stone-900 sm:hidden">
              Total: {formatRupiah(total)}
            </span>
          </div>

          {selected.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {selected.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-stone-900"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-xs"
                    style={{ backgroundColor: s.zoneColor }}
                  />
                  <span className="font-mono">{s.label}</span>
                  <span className="text-[11px] font-normal text-stone-600">
                    ({formatRupiah(s.price)})
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(s.label)}
                    aria-label={`Hapus kursi ${s.label}`}
                    className="ml-0.5 rounded-sm p-0.5 text-stone-500 hover:bg-indigo-100 hover:text-stone-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-stone-500">
              Ketuk 1–{maxSeats} kursi yang tersedia pada denah di atas.
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <span className="block text-[11px] text-stone-500">Total Pembayaran</span>
            <span className="text-base font-bold text-stone-900">{formatRupiah(total)}</span>
          </div>

          <button
            type="button"
            disabled={selected.length === 0 || loading}
            onClick={onSubmit}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 sm:w-auto"
          >
            <span>{loading ? "Menahan Kursi..." : ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
