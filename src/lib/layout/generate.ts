import { generateCircle } from "./circle.ts";
import { generateGrid } from "./grid.ts";
import type { CanvasLabel, GeneratedSeat, LayoutGenerator, LayoutV1 } from "./types.ts";
import { SEAT_SIZE } from "./types.ts";

interface BuildOptions {
  stageLabel?: string;
  stageShape?: "rect" | "ellipse";
  labels?: CanvasLabel[];
}

/**
 * Bangun LayoutV1 lengkap (kanvas + panggung) dari generator.
 * Deterministik: input yang sama → output yang sama.
 */
export function buildLayout(generator: LayoutGenerator, opts: BuildOptions = {}): LayoutV1 {
  const label = opts.stageLabel?.trim() || "PANGGUNG";
  if (generator.type === "grid") {
    const geo = generateGrid(generator.params);
    return {
      version: 1,
      canvas: geo.canvas,
      seatSize: SEAT_SIZE,
      stage: geo.stage ? { ...geo.stage, shape: "rect", label } : null,
      generator: normalizeGenerator(generator),
      labels: opts.labels ?? [],
    };
  }
  const geo = generateCircle(generator.params);
  return {
    version: 1,
    canvas: geo.canvas,
    seatSize: SEAT_SIZE,
    stage: { ...geo.stage, shape: opts.stageShape ?? "ellipse", label },
    generator: normalizeGenerator(generator),
    labels: opts.labels ?? [],
  };
}

function normalizeGenerator(g: LayoutGenerator): LayoutGenerator {
  return { ...g, removedLabels: Array.from(new Set(g.removedLabels)).sort() } as LayoutGenerator;
}

/** Semua kursi dari generator, termasuk yang dihapus (dipakai editor untuk "pulihkan"). */
export function generateAllSeats(generator: LayoutGenerator): GeneratedSeat[] {
  return generator.type === "grid"
    ? generateGrid(generator.params).seats
    : generateCircle(generator.params).seats;
}

/** Daftar kursi aktif siap simpan ke tabel Seat (tanpa kursi di `removedLabels`). */
export function layoutToSeats(layout: LayoutV1): GeneratedSeat[] {
  const removed = new Set(layout.generator.removedLabels);
  return generateAllSeats(layout.generator).filter((s) => !removed.has(s.label));
}

/** Hitung cepat jumlah kursi aktif tanpa membangun koordinat. */
export function countSeats(generator: LayoutGenerator): number {
  const total =
    generator.type === "grid"
      ? generator.params.rows * generator.params.cols
      : generator.params.seatsPerRing.reduce((a, b) => a + b, 0);
  return total - new Set(generator.removedLabels).size;
}
