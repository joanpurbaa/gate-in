"use client";

import { useMemo, useState } from "react";
import { SeatMap } from "@/components/seatmap/SeatMap";
import type {
  SeatEffectiveStatus,
  SeatMapItem,
  SeatMapMode,
  SeatZoneInfo,
} from "@/components/seatmap/types";
import { buildLayout, generateAllSeats } from "@/lib/layout/generate";
import type { GridStagePosition, LayoutGenerator } from "@/lib/layout/types";

const DEMO_ZONES: SeatZoneInfo[] = [
  { id: "vip", name: "VIP", color: "#6366F1", price: 150000 },
  { id: "reg", name: "Reguler", color: "#0EA5E9", price: 75000 },
];

export function SeatMapPlayground() {
  const [type, setType] = useState<"grid" | "circle">("grid");
  const [mode, setMode] = useState<SeatMapMode>("select");

  // Grid params
  const [rows, setRows] = useState(15);
  const [cols, setCols] = useState(20);
  const [aisleCol, setAisleCol] = useState(10);
  const [stagePosition, setStagePosition] = useState<GridStagePosition>("top");

  // Circle params
  const [rings, setRings] = useState(3);
  const [seatsPerRingText, setSeatsPerRingText] = useState("24,32,40");
  const [aisleGaps, setAisleGaps] = useState(2);

  const [removedLabels, setRemovedLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SeatEffectiveStatus>>({});

  const generator: LayoutGenerator = useMemo(() => {
    if (type === "grid") {
      return {
        type: "grid",
        params: {
          rows,
          cols,
          rowLabelStyle: "alpha",
          aisleAfterCols: aisleCol > 0 && aisleCol < cols ? [aisleCol] : [],
          aisleAfterRows: [],
          stagePosition,
        },
        removedLabels,
      };
    }
    const parsed = seatsPerRingText
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const list = Array.from({ length: rings }, (_, i) => parsed[i] ?? 24 + i * 8);
    return {
      type: "circle",
      params: {
        rings,
        seatsPerRing: list,
        aisleGaps,
        gapSizeSeats: 2,
        startAngleDeg: -90,
      },
      removedLabels,
    };
  }, [type, rows, cols, aisleCol, stagePosition, rings, seatsPerRingText, aisleGaps, removedLabels]);

  const layout = useMemo(() => buildLayout(generator), [generator]);

  const seats: SeatMapItem[] = useMemo(() => {
    const all = generateAllSeats(generator);
    const removedSet = new Set(removedLabels);
    return all.map((s) => {
      const isVip =
        type === "grid"
          ? ["A", "B", "C"].includes(s.rowLabel)
          : s.rowLabel === "R1";
      return {
        ...s,
        zoneId: isVip ? "vip" : "reg",
        status: statusOverrides[s.label] ?? "AVAILABLE",
        removed: removedSet.has(s.label),
      };
    });
  }, [generator, type, removedLabels, statusOverrides]);

  const randomizeStatus = () => {
    const next: Record<string, SeatEffectiveStatus> = {};
    seats.forEach((s, idx) => {
      const r = (idx * 37 + 13) % 20;
      if (r === 0) next[s.label] = "HELD";
      else if (r <= 3) next[s.label] = "SOLD";
      else if (r === 4) next[s.label] = "CHECKED_IN";
      else next[s.label] = "AVAILABLE";
    });
    setStatusOverrides(next);
    setSelectedLabels([]);
  };

  const handleToggleSeat = (seat: SeatMapItem) => {
    if (mode === "edit") {
      setRemovedLabels((prev) =>
        prev.includes(seat.label) ? prev.filter((l) => l !== seat.label) : [...prev, seat.label]
      );
      return;
    }
    setSelectedLabels((prev) =>
      prev.includes(seat.label) ? prev.filter((l) => l !== seat.label) : [...prev, seat.label]
    );
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Uji Komponen SeatMap (/dev/seatmap)</h1>
          <p className="text-xs text-stone-600">
            Halaman pengujian internal — tidak aktif di produksi. Total kursi aktif:{" "}
            <strong>{seats.filter((s) => !s.removed).length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={randomizeStatus}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100"
          >
            Simulasikan Status Acak
          </button>
          <button
            type="button"
            onClick={() => {
              setType("grid");
              setRows(30);
              setCols(50);
              setAisleCol(25);
            }}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-[#3730A3] hover:bg-indigo-100"
          >
            Uji 1.500 Kursi (30×50)
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-stone-700">Bentuk Layout</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType("grid");
                setRows(15);
                setCols(20);
                setAisleCol(10);
                setRemovedLabels([]);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                type === "grid"
                  ? "bg-[#3730A3] text-white"
                  : "border border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              Grid (15×20)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("circle");
                setRemovedLabels([]);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                type === "circle"
                  ? "bg-[#3730A3] text-white"
                  : "border border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              Melingkar (96)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">Mode SeatMap</label>
          <div className="mt-1 flex gap-1.5">
            {(["select", "view", "edit"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize ${
                  mode === m
                    ? "bg-[#3730A3] text-white"
                    : "border border-stone-200 bg-stone-50 text-stone-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {type === "grid" ? (
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-medium text-stone-700">
              Baris
              <input
                type="number"
                min={1}
                max={60}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs font-medium text-stone-700">
              Kolom
              <input
                type="number"
                min={1}
                max={60}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs font-medium text-stone-700">
              Panggung
              <select
                value={stagePosition}
                onChange={(e) => setStagePosition(e.target.value as GridStagePosition)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-1.5 py-1 text-xs"
              >
                <option value="top">Atas</option>
                <option value="bottom">Bawah</option>
                <option value="left">Kiri</option>
                <option value="right">Kanan</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-medium text-stone-700">
              Ring
              <input
                type="number"
                min={1}
                max={8}
                value={rings}
                onChange={(e) => setRings(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs font-medium text-stone-700">
              Kursi/Ring
              <input
                type="text"
                value={seatsPerRingText}
                onChange={(e) => setSeatsPerRingText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs font-medium text-stone-700">
              Lorong
              <input
                type="number"
                min={0}
                max={8}
                value={aisleGaps}
                onChange={(e) => setAisleGaps(Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
              />
            </label>
          </div>
        )}
      </div>

      <SeatMap
        layout={layout}
        seats={seats}
        zones={DEMO_ZONES}
        mode={mode}
        selectedLabels={selectedLabels}
        maxSeats={5}
        onToggleSeat={handleToggleSeat}
      />
    </main>
  );
}
