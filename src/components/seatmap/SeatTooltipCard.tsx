"use client";

import { Eye, X } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import type { SeatMapItem, SeatMapMode, SeatZoneInfo } from "./types";

interface SeatTooltipCardProps {
  seat: SeatMapItem;
  zone: SeatZoneInfo | undefined;
  mode: SeatMapMode;
  isSelected: boolean;
  canSelectMore: boolean;
  onToggleSelect?: (seat: SeatMapItem) => void;
  onOpenVirtualView?: (seat: SeatMapItem) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<SeatMapItem["status"], { text: string; badgeClass: string }> = {
  AVAILABLE: {
    text: "Tersedia",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  HELD: {
    text: "Sedang dipesan",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  SOLD: {
    text: "Terjual",
    badgeClass: "bg-page text-muted border-line",
  },
  CHECKED_IN: {
    text: "Hadir (sudah check-in)",
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
  onOpenVirtualView,
  onClose,
}: SeatTooltipCardProps) {
  const statusInfo = STATUS_LABEL[seat.status];

  return (
    <div
      role="dialog"
      aria-label={`Detail kursi ${seat.label}`}
      className="flex items-center justify-between gap-3 rounded-input border border-line bg-card px-3.5 py-2.5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-bold text-ink">Kursi {seat.label}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              isSelected ? "border-ink bg-ink text-white" : statusInfo.badgeClass
            }`}
          >
            {isSelected ? "Dipilih saya" : statusInfo.text}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {zone ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                <span
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name}
              </span>
              <span>•</span>
              <span className="font-semibold text-ink">{formatRupiah(zone.price)}</span>
            </>
          ) : (
            <span className="italic text-muted">Belum diberi zona</span>
          )}
          {mode === "view" && seat.buyerName && (
            <>
              <span>•</span>
              <span className="truncate font-medium text-ink">{seat.buyerName}</span>
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
            className={`min-h-9 rounded-button px-3.5 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? "border border-line bg-page text-ink hover:bg-line/60"
                : canSelectMore
                  ? "bg-gate text-white hover:bg-gate-strong"
                  : "cursor-not-allowed bg-line text-muted"
            }`}
          >
            {isSelected ? "Batalkan" : canSelectMore ? "Pilih kursi" : "Batas maks."}
          </button>
        )}
        {onOpenVirtualView && (
          <button
            type="button"
            onClick={() => onOpenVirtualView(seat)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-line bg-page px-3 py-1.5 text-xs font-semibold text-ink hover:border-gate hover:text-gate transition"
            title="Lihat simulasi sudut pandang panggung 3D dari kursi ini"
          >
            <Eye className="h-3.5 w-3.5 text-gate" />
            <span className="hidden sm:inline">Lihat dari Kursi Ini</span>
            <span className="sm:hidden">Lihat 3D</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup info kursi"
          className="rounded-lg p-1.5 text-muted hover:bg-page hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
