export type SeatEffectiveStatus = "AVAILABLE" | "HELD" | "SOLD" | "CHECKED_IN";

export type SeatMapMode = "select" | "view" | "edit";

export interface SeatZoneInfo {
  id: string;
  name: string;
  color: string;
  price: number;
}

export interface SeatMapItem {
  id?: string;
  label: string;
  rowLabel: string;
  number: number;
  x: number;
  y: number;
  rotation: number;
  status: SeatEffectiveStatus;
  zoneId?: string | null;
  removed?: boolean;
  buyerName?: string | null;
  ticketCode?: string | null;
}

/** Palet warna zona resmi (menghindari amber #F59E0B, abu-abu #9CA3AF, hijau #16A34A). */
export const ZONE_COLOR_PALETTE = [
  { name: "Indigo", hex: "#6366F1" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Violet", hex: "#A855F7" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Oranye Tua", hex: "#EA580C" },
] as const;
