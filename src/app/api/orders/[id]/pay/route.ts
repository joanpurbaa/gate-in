import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  confirmOrderSold,
  OrderHoldInvalidError,
  releaseOrderHold,
} from "@/lib/seats";
import { sendOrderWhatsApp } from "@/lib/wa";

const payBodySchema = z.object({
  outcome: z.enum(["SUCCESS", "FAILED"]),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = payBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter outcome harus SUCCESS atau FAILED" }, { status: 400 });
  }

  const { outcome } = parsed.data;

  try {
    if (outcome === "FAILED") {
      const released = await releaseOrderHold(id, "FAILED");
      return NextResponse.json({
        ok: true,
        orderId: id,
        status: released.status,
      });
    }

    const result = await confirmOrderSold(id);

    // Kirim WhatsApp hanya pada konfirmasi pertama (tidak memblokir keberhasilan order)
    let waResult: { status: "SENT" | "FAILED" | "SKIPPED"; error?: string } | null = null;
    if (!result.alreadyPaid) {
      try {
        waResult = await sendOrderWhatsApp(id, req.nextUrl.origin);
      } catch {
        waResult = { status: "FAILED" };
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: id,
      status: "PAID",
      alreadyPaid: result.alreadyPaid,
      tickets: result.tickets,
      waStatus: waResult?.status ?? null,
    });
  } catch (err) {
    if (err instanceof OrderHoldInvalidError) {
      const httpStatus =
        err.code === "ORDER_NOT_FOUND"
          ? 404
          : err.code === "HOLD_TAKEN" || err.code === "ORDER_EXPIRED"
            ? 409
            : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: httpStatus }
      );
    }
    const message = err instanceof Error ? err.message : "Gagal memproses simulasi pembayaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
