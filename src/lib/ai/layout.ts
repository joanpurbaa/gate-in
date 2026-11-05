import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const aiGridParamsSchema = z.object({
  rows: z.number().int().min(1).max(60),
  cols: z.number().int().min(1).max(60),
  rowLabelStyle: z
    .enum(["alpha", "numeric"])
    .nullish()
    .transform((v) => v ?? "alpha"),
  aisleAfterCols: z
    .array(z.number().int().min(1).max(59))
    .nullish()
    .transform((v) => v ?? []),
  aisleAfterRows: z
    .array(z.number().int().min(1).max(59))
    .nullish()
    .transform((v) => v ?? []),
  stagePosition: z
    .enum(["top", "bottom", "left", "right", "none"])
    .nullish()
    .transform((v) => v ?? "top"),
});

export const aiCircleParamsSchema = z.object({
  rings: z.number().int().min(1).max(8),
  seatsPerRing: z
    .array(z.number().int().min(1).max(400))
    .nullish()
    .transform((v) => v ?? undefined),
  totalSeats: z
    .number()
    .int()
    .min(1)
    .max(1500)
    .nullish()
    .transform((v) => v ?? undefined),
  aisleGaps: z
    .number()
    .int()
    .min(0)
    .max(8)
    .nullish()
    .transform((v) => v ?? 2),
  gapSizeSeats: z
    .number()
    .int()
    .min(1)
    .max(4)
    .nullish()
    .transform((v) => v ?? 2),
  startAngleDeg: z
    .number()
    .min(-360)
    .max(360)
    .nullish()
    .transform((v) => v ?? -90),
});

export const aiLayoutResponseSchema = z.object({
  type: z.enum(["grid", "circle", "unsupported"]),
  confidence: z.number().min(0).max(1),
  params: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((v) => v ?? {}),
  stage: z
    .object({
      shape: z
        .enum(["rect", "ellipse"])
        .nullish()
        .transform((v) => v ?? "rect"),
      position: z
        .enum(["top", "bottom", "left", "right", "center", "none"])
        .nullish()
        .transform((v) => v ?? "top"),
      label: z
        .string()
        .max(40)
        .nullish()
        .transform((v) => v || "PANGGUNG"),
    })
    .nullish()
    .transform((v) => v ?? { shape: "rect" as const, position: "top" as const, label: "PANGGUNG" }),
  warnings: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  questions: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  suggestedFallback: z
    .enum(["grid", "circle"])
    .nullish()
    .transform((v) => v ?? undefined),
});

export type AiLayoutResponse = z.infer<typeof aiLayoutResponseSchema>;

const SYSTEM_INSTRUCTION = `Kamu adalah asisten pemetaan parameter denah kursi acara (GateIn).
Tugasmu HANYA menghasilkan JSON terstruktur (TANPA markdown, TANPA koordinat per bangku) sesuai skema berikut:
{
  "type": "grid" | "circle" | "unsupported",
  "confidence": 0.0 - 1.0,
  "params": { ... },
  "stage": {
    "shape": "rect" | "ellipse",
    "position": "top" | "bottom" | "left" | "right" | "center" | "none",
    "label": "PANGGUNG"
  },
  "warnings": ["string Bahasa Indonesia"],
  "questions": ["string Bahasa Indonesia"],
  "suggestedFallback": "grid" | "circle" | null
}

ATURAN WAJIB:
1. Angka dari teks deskripsi penyelenggara adalah SUMBER KEBENARAN UTAMA. Foto hanya untuk melihat bentuk umum, posisi panggung, dan lorong. Jika foto dan teks bertentangan, gunakan angka dari teks dan tambahkan penjelasan di "warnings".
2. JANGAN mengarang angka secara diam-diam. Jika jumlah baris, kolom, ring, atau kursi TIDAK disebut di teks dan tidak jelas di foto:
   - Berikan estimasi wajar di "params" (mis. rows: 10, cols: 15 untuk grid, atau rings: 3, seatsPerRing: [20, 28, 36] untuk circle)
   - WAJIB tambahkan peringatan di "warnings" bahwa angka tersebut adalah perkiraan yang harus dicek panitia, dan ajukan pertanyaan klarifikasi di "questions".
3. Untuk type = "grid", isi "params" dengan:
   { "rows": int(1..60), "cols": int(1..60), "rowLabelStyle": "alpha"|"numeric" (default "alpha" kecuali diminta angka), "aisleAfterCols": int[], "aisleAfterRows": int[], "stagePosition": "top"|"bottom"|"left"|"right"|"none" }
   Catatan: jika disebut "lorong di tengah" pada 20 kolom, maka aisleAfterCols = [10].
4. Untuk type = "circle" (susunan melingkar / huruf O dengan panggung di tengah), isi "params" dengan:
   { "rings": int(1..8), "seatsPerRing": int[] (panjang = rings), "aisleGaps": int(0..8), "gapSizeSeats": int(1..4), "startAngleDeg": -90 }
   dan stage.position = "center", stage.shape = "ellipse".
5. Jika bentuk ruangan adalah bentuk bebas di luar grid persegi atau lingkaran terpusat (misal meja bundar banquet acak, huruf Z, huruf L kompleks, standing festival tanpa kursi), kembalikan "type": "unsupported", jelaskan alasannya di "warnings", sarankan template terdekat di "suggestedFallback" ("grid" atau "circle"), dan tulis pertanyaan di "questions".`;

async function callGeminiOnce(params: {
  apiKey: string;
  model: string;
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AiLayoutResponse> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];

  if (params.imageBase64 && params.imageMimeType) {
    parts.push({
      inlineData: {
        data: params.imageBase64,
        mimeType: params.imageMimeType,
      },
    });
  }

  parts.push({
    text: params.description?.trim()
      ? `Deskripsi penyelenggara:\n${params.description.trim()}`
      : "Analisis foto ruangan ini dan tentukan parameter layout kursinya.",
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Batas waktu analisis AI (25 detik) terlampaui")), 25000)
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: params.model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
    timeoutPromise,
  ]);

  const rawText = response.text?.trim() ?? "";
  if (!rawText) {
    throw new Error("Respons AI kosong");
  }

  const parsedJson = JSON.parse(rawText);
  const validated = aiLayoutResponseSchema.parse(parsedJson);

  if (validated.type === "grid") {
    const gridParsed = aiGridParamsSchema.parse({
      ...validated.params,
      stagePosition:
        validated.params.stagePosition ??
        (validated.stage.position !== "center" ? validated.stage.position : "top"),
    });
    return {
      ...validated,
      params: gridParsed,
    };
  }

  if (validated.type === "circle") {
    const circleParsed = aiCircleParamsSchema.parse(validated.params);
    return {
      ...validated,
      params: circleParsed,
    };
  }

  return validated;
}

/**
 * Analisis foto + deskripsi ruangan menggunakan Google Gemini.
 * Melakukan validasi Zod dan 1x retry otomatis bila output tidak sesuai skema.
 */
export async function analyzeLayoutWithAi(input: {
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AiLayoutResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di server");
  }

  try {
    return await callGeminiOnce({
      apiKey,
      model,
      description: input.description,
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
    });
  } catch (firstErr) {
    const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const retryModel =
      errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")
        ? "gemini-2.5-flash-lite"
        : model;
    // 1x retry sesuai spesifikasi SEAT_LAYOUT_SPEC.md bagian 4
    return await callGeminiOnce({
      apiKey,
      model: retryModel,
      description: input.description,
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
    }).catch(() => {
      throw firstErr;
    });
  }
}
