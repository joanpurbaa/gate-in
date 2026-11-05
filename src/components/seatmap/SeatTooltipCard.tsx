"use client";

import { X } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import type { SeatMapItem, SeatMapMode, SeatZoneInfo } from "./types";

interface SeatTooltipCardProps {
  seat: SeatMapItem;
  zone: SeatZoneInfo | undefined;
  mode: SeatMapMode;
  isSelected: boolean;
  canSelectMore: boolean;
  onToggleSelect?: (seat: SeatMapItem) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<SeatMapItem["status"], { text: string; badgeClass: string }> = {
  AVAILABLE: {
    text: "Tersedia",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  HELD: {
    text: "Sedang Dipesan",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  SOLD: {
    text: "Terjual",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-300",
  },
  CHECKED_IN: {
    text: "Hadir (Sudah Check-in)",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
};

export function SeatTooltipCard({
  seat,
  zone,
  mode,
  isSelected,
  canSelectMore,
  onToggleSelect,
  onClose,
}: SeatTooltipCardProps) {
  const statusInfo = STATUS_LABEL[seat.status];

  return (
    <div
      role="dialog"
      aria-label={`Detail kursi ${seat.label}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-stone-900">Kursi {seat.label}</span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.badgeClass}`}
          >
            {isSelected ? "Dipilih Saya" : statusInfo.text}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
          {zone ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-stone-800">
                <span
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name}
              </span>
              <span>•</span>
              <span className="font-semibold text-stone-900">{formatRupiah(zone.price)}</span>
            </>
          ) : (
            <span className="italic text-stone-500">Belum diberi zona</span>
          )}
          {mode === "view" && seat.buyerName && (
            <>
              <span>•</span>
              <span className="truncate font-medium text-stone-800">{seat.buyerName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {mode === "select" && seat.status === "AVAILABLE" && onToggleSelect && (
          <button
            type="button"
            onClick={() => onToggleSelect(seat)}
            disabled={!isSelected && !canSelectMore}
            className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? "border border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200"
                : canSelectMore
                  ? "bg-[#3730A3] text-white hover:bg-indigo-900"
                  : "cursor-not-allowed bg-stone-200 text-stone-500"
            }`}
          >
            {isSelected ? "Batalkan" : canSelectMore ? "Pilih Kursi" : "Batas Maks."}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup info kursi"
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
