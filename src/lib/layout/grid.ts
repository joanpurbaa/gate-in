import type { GeneratedSeat, GridParams, StageShape } from "./types.ts";
import { SEAT_SIZE } from "./types.ts";

const GAP = 8;
const PITCH = SEAT_SIZE + GAP; // jarak pusat ke pusat antar kursi
const AISLE = PITCH; // lorong = lebar satu kursi tambahan
const PAD = 40;
const STAGE_H = 56;
const STAGE_GAP = 48;

/** A, B, …, Z, AA, AB, … */
export function alphaLabel(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function gridRowLabel(rowIndex: number, style: GridParams["rowLabelStyle"]): string {
  return style === "numeric" ? String(rowIndex + 1) : alphaLabel(rowIndex);
}

export interface GridGeometry {
  canvas: { width: number; height: number };
  stage: Omit<StageShape, "label" | "shape"> | null;
  seats: GeneratedSeat[];
}

/**
 * Generator grid. Dibangun dulu dalam orientasi kanonik (panggung di atas,
 * baris A paling dekat panggung, nomor kiri→kanan menghadap panggung), lalu
 * diputar sesuai `stagePosition`. Rotasi 180° otomatis menjaga penomoran
 * "kiri→kanan menghadap panggung".
 */
export function generateGrid(params: GridParams): GridGeometry {
  const { rows, cols, rowLabelStyle, stagePosition } = params;
  const aisleCols = new Set(params.aisleAfterCols);
  const aisleRows = new Set(params.aisleAfterRows);

  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < cols; c++) {
    colX.push(x);
    x += PITCH;
    if (aisleCols.has(c + 1) && c < cols - 1) x += AISLE;
  }
  const rowY: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r++) {
    rowY.push(y);
    y += PITCH;
    if (aisleRows.has(r + 1) && r < rows - 1) y += AISLE;
  }
  const blockW = colX[cols - 1] + SEAT_SIZE;
  const blockH = rowY[rows - 1] + SEAT_SIZE;

  const hasStage = stagePosition !== "none";
  const stageW = Math.max(160, Math.round(blockW * 0.6));
  const contentW = Math.max(blockW, hasStage ? stageW : 0);
  const Wc = contentW + PAD * 2;
  const blockTop = PAD + (hasStage ? STAGE_H + STAGE_GAP : 0);
  const Hc = blockTop + blockH + PAD;
  const blockLeft = (Wc - blockW) / 2;

  const canonicalSeats: GeneratedSeat[] = [];
  for (let r = 0; r < rows; r++) {
    const rowLabel = gridRowLabel(r, rowLabelStyle);
    for (let c = 0; c < cols; c++) {
      const number = c + 1;
      canonicalSeats.push({
        label: `${rowLabel}-${number}`,
        rowLabel,
        number,
        x: blockLeft + colX[c] + SEAT_SIZE / 2,
        y: blockTop + rowY[r] + SEAT_SIZE / 2,
        rotation: 0,
      });
    }
  }
  const canonicalStage = hasStage
    ? { x: (Wc - stageW) / 2, y: PAD, w: stageW, h: STAGE_H }
    : null;

  // Transformasi orientasi
  type Pt = { x: number; y: number };
  let transform: (p: Pt) => Pt = (p) => p;
  let canvas = { width: Wc, height: Hc };
  let rotation = 0;
  if (stagePosition === "bottom") {
    transform = (p) => ({ x: Wc - p.x, y: Hc - p.y });
    rotation = 180;
  } else if (stagePosition === "left") {
    transform = (p) => ({ x: p.y, y: Wc - p.x });
    canvas = { width: Hc, height: Wc };
    rotation = -90;
  } else if (stagePosition === "right") {
    transform = (p) => ({ x: Hc - p.y, y: p.x });
    canvas = { width: Hc, height: Wc };
    rotation = 90;
  }

  const seats = canonicalSeats.map((s) => {
    const p = transform(s);
    return { ...s, x: round(p.x), y: round(p.y), rotation };
  });

  let stage: GridGeometry["stage"] = null;
  if (canonicalStage) {
    const a = transform({ x: canonicalStage.x, y: canonicalStage.y });
    const b = transform({
      x: canonicalStage.x + canonicalStage.w,
      y: canonicalStage.y + canonicalStage.h,
    });
    stage = {
      x: round(Math.min(a.x, b.x)),
      y: round(Math.min(a.y, b.y)),
      w: round(Math.abs(b.x - a.x)),
      h: round(Math.abs(b.y - a.y)),
    };
  }

  return { canvas: { width: round(canvas.width), height: round(canvas.height) }, stage, seats };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
