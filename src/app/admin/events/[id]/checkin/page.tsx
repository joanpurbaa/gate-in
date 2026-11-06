import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLayout } from "@/lib/layout/validate";
import { CheckinScannerClient } from "./CheckinScannerClient";

export const dynamic = "force-dynamic";

export default async function AdminCheckinPage({
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
          ticket: { select: { code: true, status: true } },
        },
      },
    },
  });

  if (!event || event.organizerId !== session.organizerId) {
    notFound();
  }

  const now = new Date();
  let soldSeats = 0;
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

  const parsedLayout = event.layout ? parseLayout(event.layout) : null;

  return (
    <div className="min-h-screen bg-page">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />
      <CheckinScannerClient
        event={{
          id: event.id,
          slug: event.slug,
          name: event.name,
          venueName: event.venueName,
          gateOpenAt: event.gateOpenAt.toISOString(),
          gateCloseAt: event.gateCloseAt.toISOString(),
        }}
        layout={parsedLayout}
        zones={event.zones.map((z) => ({
          id: z.id,
          name: z.name,
          color: z.color,
          price: z.price,
        }))}
        initialSeats={initialSeats}
        initialSold={soldSeats}
        initialCheckedIn={checkedInSeats}
      />
    </div>
  );
}
