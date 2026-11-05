import { NextResponse, type NextRequest } from "next/server";
import { OrderHoldInvalidError, releaseOrderHold } from "@/lib/seats";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  try {
    const res = await releaseOrderHold(id, "FAILED");
    return NextResponse.json({
      ok: true,
      orderId: id,
      status: res.status,
      releasedSeats: res.releasedSeats,
    });
  } catch (err) {
    if (err instanceof OrderHoldInvalidError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "ORDER_NOT_FOUND" ? 404 : 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Gagal melepas kursi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
