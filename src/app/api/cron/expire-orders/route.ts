import { NextResponse, type NextRequest } from "next/server";
import { expireStaleOrders } from "@/lib/seats";
import { sweepExpiredOffers } from "@/lib/waiting-list/matcher";

export const dynamic = "force-dynamic";

async function handleExpireCron(req: NextRequest) {
  // Verifikasi secret bila CRON_SECRET diatur di environment Vercel
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const expiredOffersResult = await sweepExpiredOffers();

    const result = await expireStaleOrders({
      notifyBuyers: true,
      requestOrigin: req.nextUrl.origin,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      expiredOffers: expiredOffersResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses kedaluwarsa pesanan";
    console.error("[CronExpireOrders] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleExpireCron(req);
}

export async function POST(req: NextRequest) {
  return handleExpireCron(req);
}
