import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Helper untuk gambar yang dibuat lewat kode (ikon aplikasi, Open Graph).
 * Hanya MEMBACA berkas di public/brand saat build/render; tidak menulis disk.
 */
export async function readBrandSvgDataUri(
  file: "favicon.svg" | "gatein-mark.svg" | "gatein-mark-reversed.svg"
): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public", "brand", file));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

/**
 * Ambil satu bobot Bricolage Grotesque (TTF) dari Google Fonts untuk ImageResponse.
 * Bila jaringan gagal, kembalikan null agar gambar tetap dibuat dengan huruf bawaan.
 */
export async function loadDisplayFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
