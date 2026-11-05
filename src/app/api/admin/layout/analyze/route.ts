import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analyzeLayoutWithAi } from "@/lib/ai/layout";
import { getAdminSession } from "@/lib/auth";

export const maxDuration = 30;

const analyzeRequestSchema = z
  .object({
    description: z.string().trim().max(2000).optional(),
    imageBase64: z.string().max(6_000_000, "Ukuran foto melebihi batas 4 MB").optional(),
    imageMimeType: z
      .enum(["image/jpeg", "image/png", "image/webp"])
      .optional(),
  })
  .refine(
    (data) => Boolean((data.description && data.description.length > 0) || data.imageBase64),
    {
      message: "Masukkan deskripsi teks atau unggah foto ruangan terlebih dahulu.",
    }
  );

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeLayoutWithAi(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "AI sedang bermasalah, silakan gunakan template manual.";
    return NextResponse.json(
      {
        error: `AI sedang bermasalah (${message}). Silakan gunakan template manual.`,
      },
      { status: 502 }
    );
  }
}
