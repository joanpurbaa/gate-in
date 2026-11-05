import type { CircleParams, GeneratedSeat, StageShape } from "./types.ts";
import { SEAT_SIZE } from "./types.ts";

const GAP = 8;
const PITCH = SEAT_SIZE + GAP;
const RING_PITCH = SEAT_SIZE + 16;
const STAGE_RADIUS = 72;
const STAGE_MARGIN = 40;
const PAD = 40;

export interface CircleGeometry {
  canvas: { width: number; height: number };
  stage: Omit<StageShape, "label" | "shape">;
  seats: GeneratedSeat[];
}

/** Bagi `n` kursi ke `g` sektor serata mungkin (sektor awal mendapat sisa). */
function splitEven(n: number, g: number): number[] {
  const base = Math.floor(n / g);
  const rem = n % g;
  return Array.from({ length: g }, (_, i) => base + (i < rem ? 1 : 0));
}

/**
 * Generator melingkar (panggung di tengah). Lorong memiliki lebar linear tetap
 * (`gapSizeSeats` × pitch) dan berpusat di sudut yang sama di semua ring,
 * sehingga lorong tampak lurus dari panggung keluar. Radius tiap ring dihitung
 * agar kursi tidak saling menumpuk.
 */
export function generateCircle(params: CircleParams): CircleGeometry {
  const { rings, seatsPerRing, aisleGaps, gapSizeSeats, startAngleDeg } = params;
  const g = Math.max(0, aisleGaps);
  const gapWidth = g > 0 ? gapSizeSeats * PITCH : 0;
  const start = (startAngleDeg * Math.PI) / 180;

  const radii: number[] = [];
  let prev = STAGE_RADIUS + STAGE_MARGIN - RING_PITCH;
  for (let i = 0; i < rings; i++) {
    const n = seatsPerRing[i] ?? 0;
    let minR: number;
    if (g === 0) {
      minR = (n * PITCH) / (2 * Math.PI);
    } else {
      const maxPerSector = Math.max(...splitEven(n, g));
      minR = ((maxPerSector * PITCH + gapWidth) * g) / (2 * Math.PI);
    }
    const r = Math.max(prev + RING_PITCH, minR);
    radii.push(r);
    prev = r;
  }

  const rMax = radii.length ? radii[radii.length - 1] : STAGE_RADIUS;
  const size = Math.ceil(2 * (rMax + SEAT_SIZE / 2 + PAD));
  const cx = size / 2;
  const cy = size / 2;

  const seats: GeneratedSeat[] = [];
  for (let i = 0; i < rings; i++) {
    const n = seatsPerRing[i] ?? 0;
    const r = radii[i];
    const rowLabel = `R${i + 1}`;
    const angles: number[] = [];
    if (g === 0) {
      const step = (2 * Math.PI) / n;
      for (let k = 0; k < n; k++) angles.push(start + k * step);
    } else {
      const sector = (2 * Math.PI) / g;
      const gapAngle = gapWidth / r;
      const span = sector - gapAngle;
      const counts = splitEven(n, g);
      for (let j = 0; j < g; j++) {
        // Lorong berpusat di start + j*sector; sektor kursi dimulai setelah setengah lorong
        const sectorStart = start + j * sector + gapAngle / 2;
        const c = counts[j];
        for (let k = 0; k < c; k++) angles.push(sectorStart + ((k + 0.5) * span) / c);
      }
    }
    angles.forEach((theta, k) => {
      const number = k + 1;
      const deg = (theta * 180) / Math.PI;
      seats.push({
        label: `${rowLabel}-${String(number).padStart(2, "0")}`,
        rowLabel,
        number,
        x: round(cx + r * Math.cos(theta)),
        y: round(cy + r * Math.sin(theta)),
        rotation: round(normalizeDeg(deg - 90)),
      });
    });
  }

  return {
    canvas: { width: size, height: size },
    stage: {
      x: cx - STAGE_RADIUS,
      y: cy - STAGE_RADIUS,
      w: STAGE_RADIUS * 2,
      h: STAGE_RADIUS * 2,
    },
    seats,
  };
}

/** Bagi total kursi ke ring secara proporsional terhadap perkiraan keliling. */
export function distributeSeatsToRings(totalSeats: number, rings: number): number[] {
  const weights = Array.from({ length: rings }, (_, i) => STAGE_RADIUS + STAGE_MARGIN + i * RING_PITCH);
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * totalSeats);
  const out = raw.map((v) => Math.floor(v));
  let rest = totalSeats - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0; k = (k + 1) % rings, rest--) out[order[k].i]++;
  return out;
}

function normalizeDeg(d: number): number {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
