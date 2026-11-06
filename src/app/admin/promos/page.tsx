import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrganizerPromos, getOrganizerPromoStats } from "@/lib/promo/service";
import { PromosClient } from "./PromosClient";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const session = await requireAdminPageSession();

  const [promos, stats, events] = await Promise.all([
    getOrganizerPromos(session.organizerId),
    getOrganizerPromoStats(session.organizerId),
    prisma.event.findMany({
      where: { organizerId: session.organizerId },
      select: {
        id: true,
        name: true,
        zones: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-page">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <PromosClient
          initialPromos={promos}
          initialStats={stats}
          events={events}
        />
      </main>
    </div>
  );
}
