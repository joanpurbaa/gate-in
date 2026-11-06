import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validatePromoCode } from "@/lib/promo/service";

const validateSchema = z.object({
  eventId: z.string().min(1, "ID acara wajib diisi"),
  promoCode: z.string().trim().min(1, "Masukkan kode promo"),
  seatLabels: z.array(z.string().trim().min(1)).min(1, "Pilih minimal 1 kursi"),
  buyerPhone: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const result = await validatePromoCode(parsed.data);

  if (!result.valid) {
    return NextResponse.json(
      {
        valid: false,
        error: result.error,
        code: result.code,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
