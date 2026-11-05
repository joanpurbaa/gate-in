import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const organizers = await prisma.organizer.count();
    const events = await prisma.event.count();
    return NextResponse.json({
      ok: true,
      db: "connected",
      latencyMs: Date.now() - started,
      counts: { organizers, events },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ ok: false, db: "error", error: message }, { status: 500 });
  }
}
