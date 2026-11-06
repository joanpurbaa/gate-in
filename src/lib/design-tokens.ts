/**
 * Cermin token warna dari src/app/globals.css untuk konteks yang tidak bisa
 * membaca variabel CSS (ImageResponse Open Graph, ikon aplikasi, canvas gambar
 * tiket). Kalau mengubah warna, ubah di kedua tempat.
 * Komponen React biasa memakai kelas Tailwind (bg-gate, text-ink, ...).
 */
export const BRAND_COLORS = {
  ink: "#12112B",
  gate: "#2B2BE8",
  ticket: "#D4FF3A",
  page: "#F7F8FC",
  card: "#FFFFFF",
  line: "#E3E5F0",
  muted: "#5B5E7A",
} as const;

export const SEAT_STATUS_COLORS = {
  held: "#F59E0B",
  sold: "#9CA3AF",
  checked: "#16A34A",
} as const;
