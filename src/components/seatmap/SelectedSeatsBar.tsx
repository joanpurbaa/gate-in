"use client";

import { X } from "lucide-react";
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
  ctaLabel = "Tahan kursi dan lanjut",
  onRemoveSeat,
  onSubmit,
}: SelectedSeatsBarProps) {
  const total = selected.reduce((acc, s) => acc + s.price, 0);

  return (
    <div className="sticky bottom-0 z-20 border-t border-line bg-card/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xs">
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs text-muted sm:justify-start sm:gap-3">
            <span>
              Kursi dipilih:{" "}
              <strong className="font-semibold text-ink">
                {selected.length}/{maxSeats}
              </strong>
            </span>
            <span className="font-display text-sm font-bold text-ink sm:hidden">
              Total: {formatRupiah(total)}
            </span>
          </div>

          {selected.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {selected.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-xs font-semibold text-ink"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-xs"
                    style={{ backgroundColor: s.zoneColor }}
                  />
                  <span>{s.label}</span>
                  <span className="text-xs font-normal text-muted">
                    ({formatRupiah(s.price)})
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(s.label)}
                    aria-label={`Hapus kursi ${s.label}`}
                    className="ml-0.5 rounded-full p-0.5 text-muted hover:bg-line hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              Ketuk 1–{maxSeats} kursi yang tersedia pada denah di atas.
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <span className="block text-xs text-muted">Total pembayaran</span>
            <span className="font-display text-base font-extrabold text-ink">
              {formatRupiah(total)}
            </span>
          </div>

          <button
            type="button"
            disabled={selected.length === 0 || loading}
            onClick={onSubmit}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gate-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none sm:w-auto"
          >
            <span>{loading ? "Menahan kursi..." : ctaLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
