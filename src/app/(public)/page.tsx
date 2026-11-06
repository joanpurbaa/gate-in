import { Suspense } from "react";
import type { LayoutV1 } from "@/lib/layout/types";
import { computeSaleState } from "@/components/ui/StatusPill";
import type { EventCardData } from "@/components/ui/EventCard";
import type { ExplainerBandProps } from "@/components/home/ExplainerBand";
import { HomeFeedClient } from "@/components/home/HomeFeedClient";
import { Skeleton } from "@/components/ui/Skeleton";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();

  // 1. Ambil seluruh acara yang PUBLISHED beserta zonanya
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { startsAt: "asc" },
    include: {
      organizer: { select: { name: true } },
      zones: { select: { id: true, name: true, color: true, price: true } },
    },
  });

  // 2. Kueri berkelompok untuk menghitung kursi tersedia dan terjual per acara (1 query agregasi)
  const seatStatsRaw = await prisma.$queryRaw<
    Array<{
      eventId: string;
      totalSeats: number;
      soldSeats: number;
      availableSeats: number;
    }>
  >`
    SELECT 
      "eventId",
      COUNT(*)::int AS "totalSeats",
      COUNT(CASE WHEN "status" = 'SOLD' THEN 1 END)::int AS "soldSeats",
      COUNT(CASE 
        WHEN "status" = 'AVAILABLE' OR ("status" = 'HELD' AND ("heldUntil" IS NULL OR "heldUntil" <= ${now})) 
        THEN 1 
      END)::int AS "availableSeats"
    FROM "Seat"
    GROUP BY "eventId"
  `;

  const statsMap = new Map(seatStatsRaw.map((s) => [s.eventId, s]));

  // 3. Susun data EventCardData
  const cards: EventCardData[] = events.map((ev) => {
    const stat = statsMap.get(ev.id);
    const totalSeats = stat?.totalSeats ?? 0;
    const soldSeats = stat?.soldSeats ?? 0;
    const availableSeats = stat?.availableSeats ?? 0;

    const layoutObj = ev.layout as { generator?: { type?: "grid" | "circle" } } | null;
    const layoutType = layoutObj?.generator?.type ?? null;
    const prices = ev.zones.map((z) => z.price);

    return {
      slug: ev.slug,
      name: ev.name,
      description: ev.description,
      posterUrl: ev.posterUrl,
      venueName: ev.venueName,
      organizerName: ev.organizerName || ev.organizer.name,
      category: ev.category,
      isFeatured: ev.isFeatured,
      startsAt: ev.startsAt,
      prices,
      totalSeats,
      soldSeats,
      availableSeats,
      layoutType,
      saleState: computeSaleState({
        salesOpenAt: ev.salesOpenAt,
        salesCloseAt: ev.salesCloseAt,
        availableCount: availableSeats,
        now,
      }),
    };
  });

  // 4. Data untuk ExplainerBand (memakai denah acara unggulan pertama)
  const featuredWithLayout =
    events.find((e) => e.isFeatured && e.layout) ??
    events.find((e) => e.layout);

  let explainerData: ExplainerBandProps | null = null;
  if (featuredWithLayout && featuredWithLayout.layout) {
    const [expSeats, expZones] = await Promise.all([
      prisma.seat.findMany({
        where: { eventId: featuredWithLayout.id },
        select: {
          id: true,
          label: true,
          rowLabel: true,
          number: true,
          x: true,
          y: true,
          rotation: true,
          status: true,
          heldUntil: true,
          zoneId: true,
        },
      }),
      prisma.zone.findMany({
        where: { eventId: featuredWithLayout.id },
        select: { id: true, name: true, color: true, price: true },
      }),
    ]);

    explainerData = {
      layout: featuredWithLayout.layout as unknown as LayoutV1,
      seats: expSeats.map((s) => ({
        id: s.id,
        label: s.label,
        rowLabel: s.rowLabel,
        number: s.number,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        status:
          s.status === "SOLD"
            ? ("SOLD" as const)
            : s.status === "HELD" && s.heldUntil && s.heldUntil > now
              ? ("HELD" as const)
              : ("AVAILABLE" as const),
        zoneId: s.zoneId,
      })),
      zones: expZones,
      eventSlug: featuredWithLayout.slug,
      eventName: featuredWithLayout.name,
    };
  }

  const totalSoldTicketsCount = seatStatsRaw.reduce((acc, curr) => acc + curr.soldSeats, 0);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] px-4 py-8 space-y-8">
          <Skeleton className="h-64 sm:h-96 w-full rounded-[20px]" />
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-[20px]" />
            <Skeleton className="h-80 rounded-[20px]" />
            <Skeleton className="h-80 rounded-[20px]" />
          </div>
        </div>
      }
    >
      <HomeFeedClient
        events={cards}
        totalEventsCount={events.length}
        totalSoldTicketsCount={totalSoldTicketsCount}
        explainerData={explainerData}
      />
    </Suspense>
  );
}
