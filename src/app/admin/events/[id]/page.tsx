import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLayout } from "@/lib/layout/validate";
import { EventMonitorClient } from "./EventMonitorClient";

export const dynamic = "force-dynamic";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPageSession();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      seats: {
        orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
        include: {
          order: { select: { buyerName: true } },
          ticket: { select: { code: true, status: true, checkedInAt: true } },
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          seats: { select: { label: true } },
          tickets: { select: { code: true } },
        },
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        include: {
          order: { select: { buyerName: true, buyerPhone: true } },
          seat: { include: { zone: true } },
        },
      },
    },
  });

  if (!event || event.organizerId !== session.organizerId) {
    notFound();
  }

  const now = new Date();
  let soldSeats = 0;
  let heldSeats = 0;
  let checkedInSeats = 0;

  const initialSeats = event.seats.map((s) => {
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

  const totalSeats = initialSeats.length;
  const availableSeats = totalSeats - soldSeats - heldSeats;
  const revenue = event.orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const parsedLayout = event.layout ? parseLayout(event.layout) : null;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />
      <EventMonitorClient
        event={{
          id: event.id,
          slug: event.slug,
          name: event.name,
          venueName: event.venueName,
          startsAt: event.startsAt.toISOString(),
          gateOpenAt: event.gateOpenAt.toISOString(),
          gateCloseAt: event.gateCloseAt.toISOString(),
          status: event.status,
        }}
        layout={parsedLayout}
        zones={event.zones.map((z) => ({
          id: z.id,
          name: z.name,
          color: z.color,
          price: z.price,
        }))}
        initialStats={{
          totalSeats,
          soldSeats,
          heldSeats,
          availableSeats,
          checkedInSeats,
          revenue,
        }}
        initialSeats={initialSeats}
        participants={event.tickets.map((t) => ({
          code: t.code,
          seatLabel: t.seat.label,
          zoneName: t.seat.zone?.name ?? "Reguler",
          price: t.seat.zone?.price ?? 0,
          buyerName: t.order.buyerName,
          buyerPhone: t.order.buyerPhone,
          status: t.status,
          checkedInAt: t.checkedInAt?.toISOString() ?? null,
        }))}
        orders={event.orders.map((o) => ({
          id: o.id,
          buyerName: o.buyerName,
          buyerPhone: o.buyerPhone,
          status: o.status,
          totalAmount: o.totalAmount,
          waStatus: o.waStatus,
          seatLabels: o.seats.map((s) => s.label),
          ticketCodes: o.tickets.map((t) => t.code),
          createdAt: o.createdAt.toISOString(),
          paidAt: o.paidAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
