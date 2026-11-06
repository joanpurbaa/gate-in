"use client";

import React, { memo, useCallback, useId, useMemo, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { LayoutV1 } from "@/lib/layout/types";
import { SeatLegend } from "./SeatLegend";
import { SeatTooltipCard } from "./SeatTooltipCard";
import type { SeatEffectiveStatus, SeatMapItem, SeatMapMode, SeatZoneInfo } from "./types";

interface SeatNodeProps {
  label: string;
  x: number;
  y: number;
  rotation: number;
  size: number;
  status: SeatEffectiveStatus;
  zoneColor: string | null;
  zoneName: string | null;
  zonePrice: number | null;
  isSelected: boolean;
  isRemoved: boolean;
  isFocused: boolean;
  mode: SeatMapMode;
  heldPatternId: string;
  onActivate: (label: string) => void;
}

const SeatNode = memo(function SeatNode({
  label,
  x,
  y,
  rotation,
  size,
  status,
  zoneColor,
  zoneName,
  zonePrice,
  isSelected,
  isRemoved,
  isFocused,
  mode,
  heldPatternId,
  onActivate,
}: SeatNodeProps) {
  const half = size / 2;
  const r = 4;

  let fill = zoneColor ?? "var(--color-line)";
  let stroke = zoneColor ? "var(--color-ink)" : "var(--color-muted)";
  let strokeWidth = 1.25;
  let strokeDasharray: string | undefined = zoneColor ? undefined : "3 2";
  let icon: "check" | "cross" | null = null;
  let opacity = 1;

  if (isRemoved) {
    fill = "var(--color-seat-void)";
    stroke = "var(--color-seat-void-edge)";
    strokeDasharray = "3 2";
    opacity = 0.45;
  } else if (mode === "view" && status === "CHECKED_IN") {
    fill = "var(--color-seat-checked)";
    stroke = "var(--color-seat-checked-edge)";
    strokeDasharray = undefined;
    icon = "check";
  } else if (status === "SOLD") {
    fill = "var(--color-seat-sold)";
    stroke = "var(--color-seat-sold-edge)";
    strokeDasharray = undefined;
    icon = "cross";
  } else if (status === "HELD") {
    fill = `url(#${heldPatternId})`;
    stroke = "var(--color-seat-held-edge)";
    strokeDasharray = undefined;
  } else if (isSelected) {
    fill = "var(--color-ink)";
    stroke = "var(--color-ink)";
    strokeWidth = 2.5;
    strokeDasharray = undefined;
    icon = "check";
  }

  const scale = isSelected || isFocused ? 1.14 : 1;
  const transform =
    rotation !== 0 || scale !== 1
      ? `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`
      : `translate(${x} ${y})`;

  const clickable =
    mode === "edit" || mode === "view" || status === "AVAILABLE" || isSelected;

  const statusText = isRemoved
    ? "dihapus"
    : status === "CHECKED_IN"
      ? "hadir"
      : status === "SOLD"
        ? "terjual"
        : status === "HELD"
          ? "sedang dipesan"
          : isSelected
            ? "dipilih"
            : "tersedia";

  const ariaLabel = `Kursi ${label}${zoneName ? `, ${zoneName}` : ""}${
    zonePrice != null ? `, Rp${zonePrice.toLocaleString("id-ID")}` : ""
  }, ${statusText}`;

  const shortNumber = label.includes("-") ? label.split("-")[1] : label;

  return (
    <g
      transform={transform}
      onClick={(e) => {
        e.stopPropagation();
        onActivate(label);
      }}
      role="button"
      tabIndex={clickable ? 0 : -1}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(label);
        }
      }}
      style={{
        cursor: clickable ? "pointer" : "not-allowed",
        opacity,
      }}
    >
      {(isSelected || isFocused) && (
        <rect
          x={-half - 3}
          y={-half - 3}
          width={size + 6}
          height={size + 6}
          rx={r + 2}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2}
        />
      )}
      <rect
        x={-half}
        y={-half}
        width={size}
        height={size}
        rx={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
      {/* Sandaran kursi kecil di sisi bawah (menghadap panggung di atas) */}
      {!isRemoved && (
        <line
          x1={-half + 4}
          y1={half - 2.5}
          x2={half - 4}
          y2={half - 2.5}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
      {icon === "check" ? (
        <path
          d="M -4.5 0.5 L -1.5 3.5 L 5 -3.5"
          fill="none"
          stroke="var(--color-card)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : icon === "cross" ? (
        <path
          d="M -4 -4 L 4 4 M 4 -4 L -4 4"
          fill="none"
          stroke="var(--color-card)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ) : (
        <text
          x={0}
          y={1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={7.5}
          fontWeight={700}
          fill={zoneColor ? "var(--color-card)" : "var(--color-ink)"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {shortNumber}
        </text>
      )}
    </g>
  );
});

export interface SeatMapProps {
  layout: LayoutV1;
  seats: SeatMapItem[];
  zones: SeatZoneInfo[];
  mode: SeatMapMode;
  selectedLabels?: string[];
  maxSeats?: number;
  onToggleSeat?: (seat: SeatMapItem) => void;
  showLegend?: boolean;
  className?: string;
}

export function SeatMap({
  layout,
  seats,
  zones,
  mode,
  selectedLabels = [],
  maxSeats = 5,
  onToggleSeat,
  showLegend = true,
  className = "",
}: SeatMapProps) {
  const patternUid = useId().replace(/:/g, "");
  const heldPatternId = `seat-held-${patternUid}`;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusedLabel, setFocusedLabel] = useState<string | null>(null);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const zoneMap = useMemo(() => {
    const m = new Map<string, SeatZoneInfo>();
    for (const z of zones) m.set(z.id, z);
    return m;
  }, [zones]);

  const selectedSet = useMemo(() => new Set(selectedLabels), [selectedLabels]);

  const seatByLabel = useMemo(() => {
    const m = new Map<string, SeatMapItem>();
    for (const s of seats) m.set(s.label, s);
    return m;
  }, [seats]);

  const canSelectMore = selectedLabels.length < maxSeats;

  const handleActivate = useCallback(
    (label: string) => {
      if (movedRef.current) return;
      const seat = seatByLabel.get(label);
      if (!seat) return;
      setFocusedLabel(label);

      if (mode === "edit") {
        onToggleSeat?.(seat);
        return;
      }
      if (mode === "select" && seat.status === "AVAILABLE") {
        const already = selectedSet.has(label);
        if (already || selectedSet.size < maxSeats) {
          onToggleSeat?.(seat);
        }
      }
    },
    [seatByLabel, mode, onToggleSeat, selectedSet, maxSeats]
  );

  // Penanda huruf baris di pinggir untuk layout grid
  const rowMarkers = useMemo(() => {
    if (layout.generator.type !== "grid") return [];
    const byRow = new Map<string, { minX: number; maxX: number; y: number }>();
    for (const s of seats) {
      if (s.removed) continue;
      const cur = byRow.get(s.rowLabel);
      if (!cur) {
        byRow.set(s.rowLabel, { minX: s.x, maxX: s.x, y: s.y });
      } else {
        cur.minX = Math.min(cur.minX, s.x);
        cur.maxX = Math.max(cur.maxX, s.x);
      }
    }
    return Array.from(byRow.entries()).map(([rowLabel, pos]) => ({
      rowLabel,
      leftX: pos.minX - layout.seatSize * 1.1,
      rightX: pos.maxX + layout.seatSize * 1.1,
      y: pos.y,
    }));
  }, [layout.generator.type, layout.seatSize, seats]);

  const clampZoom = (z: number) => Math.min(3.5, Math.max(0.65, Number(z.toFixed(2))));

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      movedRef.current = false;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchDistanceRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchDistanceRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / pinchDistanceRef.current;
      if (Math.abs(dist - pinchDistanceRef.current) > 4) {
        movedRef.current = true;
        setZoom((z) => clampZoom(z * ratio));
        pinchDistanceRef.current = dist;
      }
      return;
    }

    if (pointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 6) {
        movedRef.current = true;
      }
      if (movedRef.current) {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      setZoom((z) => clampZoom(z * factor));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const focusedSeat = focusedLabel ? seatByLabel.get(focusedLabel) : undefined;
  const focusedZone =
    focusedSeat?.zoneId != null ? zoneMap.get(focusedSeat.zoneId) : undefined;

  const { width, height } = layout.canvas;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {showLegend && <SeatLegend zones={zones} mode={mode} />}

      <div className="relative overflow-hidden rounded-card border border-line bg-card">
        {/* Kontrol zoom */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-input border border-line bg-card/95 p-1 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z * 1.25))}
            aria-label="Perbesar denah"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-page"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="min-w-11 text-center text-xs font-semibold text-ink">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z / 1.25))}
            aria-label="Perkecil denah"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-page"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset posisi denah"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-page"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-ink/85 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs">
          Geser & cubit untuk zoom • Ketuk kursi untuk detail
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[380px] w-full touch-none select-none bg-page sm:h-[480px]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onClick={() => {
            if (!movedRef.current) setFocusedLabel(null);
          }}
        >
          <defs>
            <pattern
              id={heldPatternId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--color-seat-held)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--color-seat-held-stripe)"
                strokeWidth="2.2"
              />
            </pattern>
          </defs>

          <g
            transform={`translate(${width / 2 + pan.x} ${height / 2 + pan.y}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`}
          >
            {/* Panggung */}
            {layout.stage && (
              <g>
                {layout.stage.shape === "ellipse" ? (
                  <ellipse
                    cx={layout.stage.x + layout.stage.w / 2}
                    cy={layout.stage.y + layout.stage.h / 2}
                    rx={layout.stage.w / 2}
                    ry={layout.stage.h / 2}
                    fill="var(--color-ink)"
                    stroke="var(--color-gate)"
                    strokeWidth={3}
                  />
                ) : (
                  <rect
                    x={layout.stage.x}
                    y={layout.stage.y}
                    width={layout.stage.w}
                    height={layout.stage.h}
                    rx={12}
                    fill="var(--color-ink)"
                    stroke="var(--color-gate)"
                    strokeWidth={3}
                  />
                )}
                <text
                  x={layout.stage.x + layout.stage.w / 2}
                  y={layout.stage.y + layout.stage.h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--color-card)"
                  fontSize={13}
                  fontWeight={700}
                  letterSpacing={2}
                >
                  {layout.stage.label}
                </text>
              </g>
            )}

            {/* Label tambahan */}
            {layout.labels.map((lbl, idx) => (
              <text
                key={`${lbl.text}-${idx}`}
                x={lbl.x}
                y={lbl.y}
                textAnchor="middle"
                fill="var(--color-muted)"
                fontSize={11}
                fontWeight={600}
              >
                {lbl.text}
              </text>
            ))}

            {/* Penanda baris untuk grid */}
            {rowMarkers.map((m) => (
              <g key={m.rowLabel}>
                <text
                  x={m.leftX}
                  y={m.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--color-muted)"
                  fontSize={10}
                  fontWeight={700}
                >
                  {m.rowLabel}
                </text>
                <text
                  x={m.rightX}
                  y={m.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--color-muted)"
                  fontSize={10}
                  fontWeight={700}
                >
                  {m.rowLabel}
                </text>
              </g>
            ))}

            {/* Kursi */}
            {seats.map((s) => {
              if (s.removed && mode !== "edit") return null;
              const z = s.zoneId ? zoneMap.get(s.zoneId) : undefined;
              return (
                <SeatNode
                  key={s.label}
                  label={s.label}
                  x={s.x}
                  y={s.y}
                  rotation={s.rotation}
                  size={layout.seatSize}
                  status={s.status}
                  zoneColor={z?.color ?? null}
                  zoneName={z?.name ?? null}
                  zonePrice={z?.price ?? null}
                  isSelected={selectedSet.has(s.label)}
                  isRemoved={Boolean(s.removed)}
                  isFocused={focusedLabel === s.label}
                  mode={mode}
                  heldPatternId={heldPatternId}
                  onActivate={handleActivate}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {focusedSeat && (
        <SeatTooltipCard
          seat={focusedSeat}
          zone={focusedZone}
          mode={mode}
          isSelected={selectedSet.has(focusedSeat.label)}
          canSelectMore={canSelectMore}
          onToggleSelect={onToggleSeat}
          onClose={() => setFocusedLabel(null)}
        />
      )}
    </div>
  );
}
