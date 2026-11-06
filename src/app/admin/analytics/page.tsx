import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSalesPerformanceAnalytics } from "@/lib/analytics/service";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; period?: string }>;
}) {
  const session = await requireAdminPageSession();
  const { eventId, period } = await searchParams;

  // Ambil seluruh event milik organizer untuk pilihan filter
  const events = await prisma.event.findMany({
    where: { organizerId: session.organizerId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      startsAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const targetPeriod =
    period === "7d" || period === "90d" || period === "all" ? period : "30d";

  const initialData = await getSalesPerformanceAnalytics(session.organizerId, {
    eventId,
    period: targetPeriod,
    granularity: "daily",
    compareWithPrevious: true,
  });

  return (
    <div className="min-h-screen bg-page">
      <AdminHeader organizerName={session.name} organizerEmail={session.email} />
      <AnalyticsClient
        initialData={initialData}
        events={events.map((e) => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          status: e.status,
          startsAt: e.startsAt.toISOString(),
        }))}
      />
    </div>
  );
}
