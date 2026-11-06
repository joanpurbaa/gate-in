import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { getEventWaitingListDashboard } from "@/lib/waiting-list/service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;
  const event = await getOwnedEventOrNull(eventId, session.organizerId);
  if (!event) {
    return NextResponse.json(
      { error: "Acara tidak ditemukan atau Anda tidak memiliki akses" },
      { status: 404 }
    );
  }

  try {
    const dashboard = await getEventWaitingListDashboard(eventId);
    return NextResponse.json({
      ok: true,
      ...dashboard,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat data waiting list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
