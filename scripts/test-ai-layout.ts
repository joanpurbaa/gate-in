import { existsSync } from "node:fs";
import { analyzeLayoutWithAi } from "../src/lib/ai/layout.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const TEST_CASES = [
  {
    name: "1. Grid biasa",
    description:
      "Ruangan petak 20m x 20m dengan layout bangku kotak biasa terdiri dari 15 baris dan 20 kolom menghadap panggung di depan.",
  },
  {
    name: "2. Grid dengan lorong",
    description:
      "Hall seminar dengan 12 baris dan 16 kolom bangku, ada lorong jalan di tengah setelah kolom 8, panggung di sisi atas.",
  },
  {
    name: "3. Lingkaran dengan panggung di tengah",
    description:
      "Konser akustik dengan bangku dijejerkan melingkar berbentuk huruf O mengelilingi panggung di tengah. Ada 3 ring kursi masing-masing 24, 32, dan 40 bangku, serta 2 lorong masuk.",
  },
  {
    name: "4. Deskripsi kekurangan angka",
    description:
      "Ruangan aula kotak biasa dengan panggung di depan dan lorong di tengah, tapi saya belum menghitung berapa baris dan kolom kursinya.",
  },
  {
    name: "5. Bentuk tidak didukung",
    description:
      "Acara gala dinner dengan 25 meja bundar terpisah yang disebar acak membentuk huruf Z mengelilingi kolam.",
  },
];

async function main() {
  console.log(`Menguji AI Layout dengan model: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}\n`);
  for (const tc of TEST_CASES) {
    console.log(`=== ${tc.name} ===`);
    console.log(`Input: "${tc.description}"`);
    try {
      const res = await analyzeLayoutWithAi({ description: tc.description });
      console.log("Output:", JSON.stringify(res, null, 2));
    } catch (err) {
      console.error("Gagal:", err instanceof Error ? err.message : err);
    }
    console.log("");
  }
}

main();
