import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await getOwnedEventOrNull(id, session.organizerId);
  if (!owned) {
    return NextResponse.json({ error: "Acara tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const [seats, paidOrders] = await Promise.all([
    prisma.seat.findMany({
      where: { eventId: owned.id },
      orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
      select: {
        id: true,
        label: true,
        rowLabel: true,
        number: true,
        x: true,
        y: true,
        rotation: true,
        zoneId: true,
        status: true,
        heldUntil: true,
        order: {
          select: {
            buyerName: true,
          },
        },
        ticket: {
          select: {
            code: true,
            status: true,
            checkedInAt: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { eventId: owned.id, status: "PAID" },
      select: { totalAmount: true },
    }),
  ]);

  let soldSeats = 0;
  let heldSeats = 0;
  let checkedInSeats = 0;

  const mappedSeats = seats.map((s) => {
    const expiredHold = s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now);
    const baseStatus = expiredHold ? "AVAILABLE" : s.status;

    let effectiveStatus: "AVAILABLE" | "HELD" | "SOLD" | "CHECKED_IN" = baseStatus;
    if (baseStatus === "SOLD") {
      soldSeats++;
      if (s.ticket?.status === "USED") {
        effectiveStatus = "CHECKED_IN";
        checkedInSeats++;
      }
    } else if (baseStatus === "HELD") {
      heldSeats++;
    }

    return {
      id: s.id,
      label: s.label,
      rowLabel: s.rowLabel,
      number: s.number,
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      zoneId: s.zoneId,
      status: effectiveStatus,
      buyerName: s.order?.buyerName ?? null,
      ticketCode: s.ticket?.code ?? null,
    };
  });

  const totalSeats = seats.length;
  const availableSeats = totalSeats - soldSeats - heldSeats;
  const revenue = paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  return NextResponse.json({
    updatedAt: now.toISOString(),
    stats: {
      totalSeats,
      soldSeats,
      heldSeats,
      availableSeats,
      checkedInSeats,
      revenue,
    },
    seats: mappedSeats,
  });
}
