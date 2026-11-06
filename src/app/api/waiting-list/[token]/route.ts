import { NextResponse, type NextRequest } from "next/server";
import {
  cancelWaitingList,
  getWaitingListStatus,
  WaitingListError,
} from "@/lib/waiting-list/service";
import { matchWaitingListForEvent } from "@/lib/waiting-list/matcher";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const status = await getWaitingListStatus(token);

  if (!status) {
    return NextResponse.json(
      { error: "Pendaftaran waiting list tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    entry: status,
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  try {
    const existing = await getWaitingListStatus(token);
    await cancelWaitingList(token);

    // Jika antrean yang dibatalkan sempat memiliki alokasi, picu matching untuk kandidat berikutnya
    if (existing) {
      matchWaitingListForEvent(
        existing.eventId,
        existing.zoneId,
        req.nextUrl.origin
      ).catch(console.error);
    }

    return NextResponse.json({
      ok: true,
      message: "Pendaftaran waiting list berhasil dibatalkan",
    });
  } catch (err) {
    if (err instanceof WaitingListError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "NOT_FOUND" ? 404 : 400 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Gagal membatalkan waiting list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
