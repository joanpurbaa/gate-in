import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { expireStaleOrders } from "@/lib/seats";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  // Pemulihan oportunistik di latar belakang (non-blocking) untuk membersihkan order basi
  expireStaleOrders({ batchSize: 20, notifyBuyers: true }).catch(() => null);

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      seats: {
        select: {
          id: true,
          label: true,
          status: true,
          heldUntil: true,
          zoneId: true,
        },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const seats = event.seats.map((s) => {
    const isExpiredHold = s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now);
    return {
      id: s.id,
      label: s.label,
      zoneId: s.zoneId,
      status: isExpiredHold ? ("AVAILABLE" as const) : s.status,
    };
  });

  return NextResponse.json({
    eventId: event.id,
    updatedAt: now.toISOString(),
    seats,
  });
}
