import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EventWizardClient } from "@/components/admin/EventWizardClient";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLayout } from "@/lib/layout/validate";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
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
        select: {
          label: true,
          zoneId: true,
          status: true,
        },
      },
    },
  });

  if (!event || event.organizerId !== session.organizerId) {
    notFound();
  }

  const parsedLayout = event.layout ? parseLayout(event.layout) : null;
  const seatZoneByLabel: Record<string, string> = {};
  for (const s of event.seats) {
    if (s.zoneId) {
      seatZoneByLabel[s.label] = s.zoneId;
    }
  }

  const hasNonAvailable = event.seats.some((s) => s.status !== "AVAILABLE");

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />
      <EventWizardClient
        initial={{
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description,
          posterUrl: event.posterUrl,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          startsAt: event.startsAt.toISOString(),
          gateOpenAt: event.gateOpenAt.toISOString(),
          gateCloseAt: event.gateCloseAt.toISOString(),
          salesOpenAt: event.salesOpenAt.toISOString(),
          salesCloseAt: event.salesCloseAt.toISOString(),
          maxSeatsPerOrder: event.maxSeatsPerOrder,
          contactInfo: event.contactInfo,
          policyNote: event.policyNote,
          status: event.status,
          layoutLocked: event.layoutLocked || hasNonAvailable,
          stageLabel: parsedLayout?.stage?.label ?? "PANGGUNG",
          generator: parsedLayout?.generator ?? null,
          zones: event.zones.map((z) => ({
            clientId: z.id,
            name: z.name,
            color: z.color,
            price: z.price,
          })),
          seatZoneByLabel,
        }}
      />
    </div>
  );
}
