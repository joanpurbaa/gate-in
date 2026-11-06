import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { getSalesPerformanceAnalytics } from "@/lib/analytics/service";
import type { AnalyticsGranularity, AnalyticsPeriod } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const eventId = searchParams.get("eventId") || undefined;
  const period = (searchParams.get("period") as AnalyticsPeriod) || "30d";
  const granularity = (searchParams.get("granularity") as AnalyticsGranularity) || "daily";
  const compareWithPrevious = searchParams.get("compare") === "true";

  if (eventId) {
    const owned = await getOwnedEventOrNull(eventId, session.organizerId);
    if (!owned) {
      return NextResponse.json(
        { error: "Acara tidak ditemukan atau Anda tidak memiliki akses" },
        { status: 404 }
      );
    }
  }

  try {
    const analytics = await getSalesPerformanceAnalytics(session.organizerId, {
      eventId,
      period,
      granularity,
      compareWithPrevious,
    });

    return NextResponse.json({
      ok: true,
      data: analytics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses data analitik";
    console.error("[Analytics:API] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
