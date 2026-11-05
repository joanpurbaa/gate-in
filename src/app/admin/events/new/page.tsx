import { AdminHeader } from "@/components/admin/AdminHeader";
import { EventWizardClient } from "@/components/admin/EventWizardClient";
import { requireAdminPageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await requireAdminPageSession();
  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const startsAt = new Date(now.getTime() + 7 * day);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />
      <EventWizardClient
        initial={{
          name: "",
          description: "",
          posterUrl: null,
          venueName: "Summarecon Mall Bandung",
          venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
          startsAt: startsAt.toISOString(),
          gateOpenAt: new Date(startsAt.getTime() - 1 * hour).toISOString(),
          gateCloseAt: new Date(startsAt.getTime() + 3 * hour).toISOString(),
          salesOpenAt: new Date(now.getTime() - 1 * hour).toISOString(),
          salesCloseAt: new Date(startsAt.getTime() - 2 * hour).toISOString(),
          maxSeatsPerOrder: 5,
          contactInfo: "WhatsApp Panitia: 0812-2026-8800",
          policyNote: "Tiket yang sudah dibeli bersifat final.",
          status: "DRAFT",
          layoutLocked: false,
          stageLabel: "PANGGUNG",
          generator: null,
          zones: [
            { clientId: "zone_vip", name: "VIP", color: "#6366F1", price: 150000 },
            { clientId: "zone_reg", name: "Reguler", color: "#0EA5E9", price: 75000 },
          ],
          seatZoneByLabel: {},
        }}
      />
    </div>
  );
}
