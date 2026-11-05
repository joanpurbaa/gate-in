/**
 * Tipe layout kursi versi 1. Lihat docs/SEAT_LAYOUT_SPEC.md.
 * Layout disimpan di `Event.layout` (Json). Koordinat kursi diturunkan secara
 * deterministik dari `generator` oleh `generate.ts`.
 */

export type GridStagePosition = "top" | "bottom" | "left" | "right" | "none";

export interface GridParams {
  rows: number;
  cols: number;
  rowLabelStyle: "alpha" | "numeric";
  /** Nomor kolom (1-based) yang diikuti lorong, mis. [10] */
  aisleAfterCols: number[];
  /** Nomor baris (1-based) yang diikuti lorong */
  aisleAfterRows: number[];
  stagePosition: GridStagePosition;
}

export interface CircleParams {
  rings: number;
  /** Jumlah kursi per ring, ring 1 = paling dekat panggung */
  seatsPerRing: number[];
  /** Jumlah celah lorong yang tersebar rata */
  aisleGaps: number;
  /** Lebar celah lorong dalam satuan kursi */
  gapSizeSeats: number;
  /** Sudut mulai (derajat), -90 = atas */
  startAngleDeg: number;
}

export type LayoutGenerator =
  | { type: "grid"; params: GridParams; removedLabels: string[] }
  | { type: "circle"; params: CircleParams; removedLabels: string[] };

export interface StageShape {
  shape: "rect" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface CanvasLabel {
  x: number;
  y: number;
  text: string;
}

export interface LayoutV1 {
  version: 1;
  canvas: { width: number; height: number };
  seatSize: number;
  stage: StageShape | null;
  generator: LayoutGenerator;
  labels: CanvasLabel[];
}

/** Kursi hasil generator, siap disimpan ke tabel Seat. */
export interface GeneratedSeat {
  label: string;
  rowLabel: string;
  number: number;
  x: number;
  y: number;
  rotation: number;
}

export const MAX_SEATS_PER_EVENT = 1500;
export const SEAT_SIZE = 24;
