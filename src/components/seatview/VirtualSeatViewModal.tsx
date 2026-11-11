"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Compass,
  RotateCcw,
  Sliders,
  Eye,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { LayoutV1 } from "@/lib/layout/types";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import {
  DEFAULT_AUDITORIUM_CONFIG,
  type Auditorium3DConfig,
} from "@/lib/seatview/types";
import type { SightlineMetrics } from "@/lib/seatview/math";
import { VirtualSeatCanvas } from "./VirtualSeatCanvas";
import { formatRupiah } from "@/lib/money";

interface VirtualSeatViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: LayoutV1;
  seats: SeatMapItem[];
  zones: SeatZoneInfo[];
  initialSeat: SeatMapItem;
  selectedSeats?: SeatMapItem[];
  onSelectSeat?: (seat: SeatMapItem) => void;
}

export function VirtualSeatViewModal({
  isOpen,
  onClose,
  layout,
  seats,
  zones,
  initialSeat,
  selectedSeats = [],
  onSelectSeat,
}: VirtualSeatViewModalProps) {
  // Current active seat in 3D view (derived or switched by user)
  const [switchedSeat, setSwitchedSeat] = useState<SeatMapItem | null>(null);
  const activeSeat = switchedSeat ?? initialSeat;

  // Configurable 3D parameters
  const [config, setConfig] = useState<Auditorium3DConfig>(DEFAULT_AUDITORIUM_CONFIG);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [sightline, setSightline] = useState<SightlineMetrics | null>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Zone info for active seat
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const activeZone = activeSeat.zoneId ? zoneMap.get(activeSeat.zoneId) : undefined;

  const handleResetCamera = () => {
    window.dispatchEvent(new CustomEvent("gatein:seatview-reset"));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="seatview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0b16] shadow-2xl text-white">
        {/* Top Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#121124]/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gate text-white shadow-md">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="seatview-title" className="font-display text-sm font-bold sm:text-base">
                  Virtual Seat View 3D
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-gate-ticket/20 px-2 py-0.5 text-[10px] font-bold text-gate-ticket">
                  <Sparkles className="h-3 w-3" />
                  Mata Manusia (1.15m)
                </span>
              </div>
              <p className="text-xs text-white/60">
                Simulasi sudut pandang nyata panggung dari kursi terpilih
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick seat switcher if multiple seats are selected */}
            {selectedSeats.length > 1 && (
              <div className="relative hidden sm:block">
                <select
                  value={activeSeat.label}
                  onChange={(e) => {
                    const found = seats.find((s) => s.label === e.target.value);
                    if (found) {
                      setSwitchedSeat(found);
                      onSelectSeat?.(found);
                    }
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white outline-none hover:bg-white/15 cursor-pointer"
                >
                  {selectedSeats.map((s) => (
                    <option key={s.label} value={s.label} className="bg-[#121124] text-white">
                      Kursi {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup simulasi 3D"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Seat Badge & Multi-Seat Quick Pills (Mobile/Desktop) */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-[#16142c]/70 px-4 py-2 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-display font-bold text-white">Kursi {activeSeat.label}</span>
            <span className="text-white/40">•</span>
            {activeZone ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-white/90">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeZone.color }}
                />
                {activeZone.name} ({formatRupiah(activeZone.price)})
              </span>
            ) : (
              <span className="text-white/60">Reguler</span>
            )}

            {selectedSeats.length > 1 && (
              <div className="flex items-center gap-1.5 pl-2 sm:hidden">
                <span className="text-white/40">Bandingkan:</span>
                {selectedSeats.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setSwitchedSeat(s);
                      onSelectSeat?.(s);
                    }}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      activeSeat.label === s.label
                        ? "bg-gate text-white"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick toggle for config parameter drawer */}
          <button
            type="button"
            onClick={() => setShowConfigPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showConfigPanel
                ? "border-gate bg-gate text-white"
                : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Atur Fisik</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showConfigPanel ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* 3D WebGL Canvas Area with Overlays */}
        <div className="relative flex-1 bg-[#090814] overflow-hidden min-h-[350px]">
          <VirtualSeatCanvas
            layout={layout}
            seats={seats}
            zones={zones}
            currentSeat={activeSeat}
            config={config}
            onSightlineUpdate={setSightline}
            className="h-full w-full"
          />

          {/* Sightline Perspective HUD (Top Left Overlay) */}
          {sightline && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#121124]/85 p-3 text-xs backdrop-blur-md sm:left-4 sm:top-4 max-w-[280px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/60">Jarak ke Panggung:</span>
                <span className="font-mono font-bold text-white">
                  {sightline.distanceToStage} m
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/60">Sudut Elevasi Mata:</span>
                <span
                  className={`font-mono font-bold ${
                    sightline.verticalAngleDeg > 20
                      ? "text-amber-400"
                      : sightline.verticalAngleDeg < -10
                        ? "text-blue-300"
                        : "text-emerald-400"
                  }`}
                >
                  {sightline.verticalAngleDeg > 0 ? `+${sightline.verticalAngleDeg}°` : `${sightline.verticalAngleDeg}°`}
                  {sightline.verticalAngleDeg > 20 ? " (Mendongak)" : " (Sejajar)"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/60">Tinggi Duduk:</span>
                <span className="font-mono font-bold text-white">
                  +{sightline.eyeElevation} m
                </span>
              </div>
              <div className="mt-1 border-t border-white/10 pt-1.5 text-[11px] text-white/80 leading-snug">
                {sightline.qualityDescription}
              </div>
            </div>
          )}

          {/* Look-around Drag Hint & Reset Camera (Bottom Overlay) */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none sm:bottom-4 sm:left-4 sm:right-4">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md">
              <Compass className="h-3.5 w-3.5 text-gate-ticket animate-spin-slow" />
              <span>Geser / sentuh layar untuk menoleh ke segala arah</span>
            </div>

            <button
              type="button"
              onClick={handleResetCamera}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#1e1c36]/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-gate hover:border-gate"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Pandangan</span>
            </button>
          </div>

          {/* Config Parameter Drawer / Popover */}
          {showConfigPanel && (
            <div className="absolute right-3 top-3 z-20 w-80 rounded-2xl border border-white/20 bg-[#121124]/95 p-4 text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 sm:right-4 sm:top-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display font-bold text-white">Parameter Fisik Venue</span>
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Stage Elevation Presets (Skenario A & B) */}
              <div className="mb-3">
                <label className="mb-1 block font-semibold text-white/80">
                  Tinggi Panggung:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Rendah (0.5m)", val: 0.5 },
                    { label: "Standar (1.2m)", val: 1.2 },
                    { label: "Tinggi (2.5m)", val: 2.5 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, stageHeight: p.val }))}
                      className={`rounded-lg border px-2 py-1.5 text-center font-medium transition ${
                        config.stageHeight === p.val
                          ? "border-gate bg-gate text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floor Slope: Raked vs Flat */}
              <div className="mb-3">
                <label className="mb-1 block font-semibold text-white/80">
                  Kontur Lantai Penonton:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, isRakedFloor: true }))}
                    className={`rounded-lg border px-2 py-1.5 text-center font-medium transition ${
                      config.isRakedFloor
                        ? "border-gate bg-gate text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Bertingkat (Teater)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, isRakedFloor: false }))}
                    className={`rounded-lg border px-2 py-1.5 text-center font-medium transition ${
                      !config.isRakedFloor
                        ? "border-gate bg-gate text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Datar (Ballroom)
                  </button>
                </div>
              </div>

              {/* Camera Field of View (FOV) */}
              <div className="mb-3">
                <label className="mb-1 block font-semibold text-white/80">
                  Sudut Pandang Kamera (FOV):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Mata Normal (65°)", val: 65 },
                    { label: "Lensa Lebar (75°)", val: 75 },
                  ].map((f) => (
                    <button
                      key={f.val}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, fov: f.val }))}
                      className={`rounded-lg border px-2 py-1.5 text-center font-medium transition ${
                        config.fov === f.val
                          ? "border-gate bg-gate text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eye Height */}
              <div>
                <label className="mb-1 block font-semibold text-white/80">
                  Tinggi Mata Duduk: {config.eyeHeight} m
                </label>
                <input
                  type="range"
                  min="0.9"
                  max="1.4"
                  step="0.05"
                  value={config.eyeHeight}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, eyeHeight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-gate cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
