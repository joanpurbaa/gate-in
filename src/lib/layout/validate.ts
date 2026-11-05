import { z } from "zod";
import { MAX_SEATS_PER_EVENT } from "./types.ts";
import type { LayoutGenerator, LayoutV1 } from "./types.ts";

const intArray = (max: number) => z.array(z.number().int().min(1).max(max)).max(60);

export const gridParamsSchema = z.object({
  rows: z.number().int().min(1, "Minimal 1 baris").max(60, "Maksimal 60 baris"),
  cols: z.number().int().min(1, "Minimal 1 kolom").max(60, "Maksimal 60 kolom"),
  rowLabelStyle: z.enum(["alpha", "numeric"]).default("alpha"),
  aisleAfterCols: intArray(60).default([]),
  aisleAfterRows: intArray(60).default([]),
  stagePosition: z.enum(["top", "bottom", "left", "right", "none"]).default("top"),
});

export const circleParamsSchema = z
  .object({
    rings: z.number().int().min(1, "Minimal 1 ring").max(8, "Maksimal 8 ring"),
    seatsPerRing: z.array(z.number().int().min(1).max(400)).min(1).max(8),
    aisleGaps: z.number().int().min(0).max(8).default(0),
    gapSizeSeats: z.number().int().min(1).max(4).default(1),
    startAngleDeg: z.number().min(-360).max(360).default(-90),
  })
  .refine((p) => p.seatsPerRing.length === p.rings, {
    message: "Jumlah isian kursi per ring harus sama dengan jumlah ring",
    path: ["seatsPerRing"],
  })
  .refine((p) => p.aisleGaps === 0 || p.seatsPerRing.every((n) => n >= p.aisleGaps), {
    message: "Setiap ring harus punya kursi minimal sebanyak jumlah lorong",
    path: ["aisleGaps"],
  });

const removedLabels = z.array(z.string().min(1).max(20)).max(MAX_SEATS_PER_EVENT).default([]);

export const generatorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("grid"), params: gridParamsSchema, removedLabels }),
  z.object({ type: z.literal("circle"), params: circleParamsSchema, removedLabels }),
]);

export const stageSchema = z.object({
  shape: z.enum(["rect", "ellipse"]),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  label: z.string().max(40),
});

export const layoutSchema = z.object({
  version: z.literal(1),
  canvas: z.object({ width: z.number().positive(), height: z.number().positive() }),
  seatSize: z.number().positive(),
  stage: stageSchema.nullable(),
  generator: generatorSchema,
  labels: z.array(z.object({ x: z.number(), y: z.number(), text: z.string().max(60) })).max(20).default([]),
});

export type LayoutValidation =
  | { ok: true; generator: LayoutGenerator; seatCount: number }
  | { ok: false; error: string };

/** Validasi generator + batas total kursi (maks 1.500). */
export function validateGenerator(input: unknown): LayoutValidation {
  const parsed = generatorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Parameter layout tidak valid" };
  }
  const g = parsed.data as LayoutGenerator;
  const total =
    g.type === "grid"
      ? g.params.rows * g.params.cols
      : g.params.seatsPerRing.reduce((a, b) => a + b, 0);
  const active = total - new Set(g.removedLabels).size;
  if (total > MAX_SEATS_PER_EVENT) {
    return {
      ok: false,
      error: `Total ${total} kursi melebihi batas ${MAX_SEATS_PER_EVENT.toLocaleString("id-ID")} kursi per event`,
    };
  }
  if (active < 1) return { ok: false, error: "Layout harus memiliki minimal 1 kursi" };
  return { ok: true, generator: g, seatCount: active };
}

/** Parse layout dari kolom Json database. Melempar error bila rusak. */
export function parseLayout(input: unknown): LayoutV1 {
  return layoutSchema.parse(input) as LayoutV1;
}
