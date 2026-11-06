import { z } from "zod";
import { buildLayout, layoutToSeats } from "./layout/generate.ts";
import { generatorSchema } from "./layout/validate.ts";
import { MAX_SEATS_PER_EVENT } from "./layout/types.ts";

export const zoneInputSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1, "Nama zona wajib diisi").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Warna zona harus kode hex"),
  price: z.number().int().min(0, "Harga tidak boleh negatif").max(50_000_000),
});

export const eventPayloadSchema = z.object({
  name: z.string().trim().min(3, "Nama acara minimal 3 karakter").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung")
    .min(3)
    .max(100)
    .optional(),
  description: z.string().trim().max(4000).default(""),
  posterUrl: z.string().trim().url("URL poster tidak valid").nullable().optional(),
  category: z.enum(["MUSIC", "TECH", "ARTS", "EDUCATION", "COMMUNITY", "SPORTS"]).default("COMMUNITY"),
  organizerName: z.string().trim().max(100).nullable().optional(),
  venueName: z.string().trim().min(2, "Nama tempat wajib diisi").max(160),
  venueAddress: z.string().trim().max(240).nullable().optional(),
  startsAt: z.string().datetime({ message: "Tanggal & jam mulai tidak valid" }),
  gateOpenAt: z.string().datetime({ message: "Jam buka gate tidak valid" }),
  gateCloseAt: z.string().datetime({ message: "Jam tutup gate tidak valid" }),
  salesOpenAt: z.string().datetime({ message: "Tanggal buka penjualan tidak valid" }),
  salesCloseAt: z.string().datetime({ message: "Tanggal tutup penjualan tidak valid" }),
  maxSeatsPerOrder: z.number().int().min(1).max(10).default(5),
  contactInfo: z.string().trim().max(200).nullable().optional(),
  policyNote: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  stageLabel: z.string().trim().max(40).default("PANGGUNG"),
  generator: generatorSchema.nullable().optional(),
  zones: z.array(zoneInputSchema).max(12).default([]),
  /** Pemetaan label kursi -> clientId zona */
  seatZoneByLabel: z.record(z.string(), z.string()).default({}),
});

export type EventPayloadInput = z.infer<typeof eventPayloadSchema>;

export function slugifyEventName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || "event"}-${rand}`;
}

export function validateEventBusinessRules(input: EventPayloadInput): string | null {
  const startsAt = new Date(input.startsAt);
  const gateOpenAt = new Date(input.gateOpenAt);
  const gateCloseAt = new Date(input.gateCloseAt);
  const salesOpenAt = new Date(input.salesOpenAt);
  const salesCloseAt = new Date(input.salesCloseAt);

  if (salesCloseAt < salesOpenAt) {
    return "Tanggal tutup penjualan harus setelah tanggal buka penjualan.";
  }
  if (gateCloseAt <= gateOpenAt) {
    return "Jam selesai open gate harus setelah jam mulai open gate.";
  }

  if (input.generator) {
    const layout = buildLayout(input.generator, { stageLabel: input.stageLabel });
    const seats = layoutToSeats(layout);
    if (seats.length > MAX_SEATS_PER_EVENT) {
      return `Jumlah kursi (${seats.length}) melebihi batas ${MAX_SEATS_PER_EVENT} kursi.`;
    }
    if (input.status === "PUBLISHED") {
      if (seats.length < 1) {
        return "Event yang dipublikasikan harus memiliki minimal 1 kursi.";
      }
      if (input.zones.length < 1) {
        return "Tambahkan minimal 1 zona harga sebelum mempublikasikan acara.";
      }
      const validZoneIds = new Set(input.zones.map((z) => z.clientId));
      const unassigned = seats.filter((s) => {
        const zId = input.seatZoneByLabel[s.label];
        return !zId || !validZoneIds.has(zId);
      });
      if (unassigned.length > 0) {
        return `Masih ada ${unassigned.length} kursi yang belum diberi zona harga (contoh: ${unassigned
          .slice(0, 3)
          .map((s) => s.label)
          .join(", ")}).`;
      }
    }
  } else if (input.status === "PUBLISHED") {
    return "Susun denah kursi dan zona terlebih dahulu sebelum mempublikasikan acara.";
  }

  if (input.status === "PUBLISHED") {
    if (salesCloseAt > startsAt) {
      return "Penutupan penjualan harus sebelum atau tepat saat acara dimulai.";
    }
    if (gateOpenAt > gateCloseAt || gateOpenAt > new Date(startsAt.getTime() + 6 * 3600 * 1000)) {
      return "Jam open gate harus berada sebelum acara selesai.";
    }
  }

  return null;
}
