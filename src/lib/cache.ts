import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { computeSaleState } from "@/components/ui/StatusPill";
import type { EventCardData } from "@/components/ui/EventCard";
import type { ExplainerBandProps } from "@/components/home/ExplainerBand";
import type { LayoutV1 } from "@/lib/layout/types";

/**
 * Interface data publik beranda marketplace yang telah diproses dan di-cache.
 */
export interface CachedMarketplacePayload {
  cards: EventCardData[];
  totalEventsCount: number;
  totalSoldTicketsCount: number;
  explainerData: ExplainerBandProps | null;
}

/**
 * Caching native Next.js untuk data beranda marketplace acara.
 * Mengurangi beban database Neon pada akses pembeli berulang.
 * Revalidasi otomatis setiap 60 detik atau instan saat ada pembaruan acara.
 */
export const getCachedMarketplaceData = unstable_cache(
  async (): Promise<CachedMarketplacePayload> => {
    const now = new Date();

    // 1. Ambil seluruh acara PUBLISHED beserta zonanya
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startsAt: "asc" },
      include: {
        organizer: { select: { name: true } },
        zones: { select: { id: true, name: true, color: true, price: true } },
      },
    });

    // 2. Kueri agregasi kursi per acara
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

    // 3. Susun daftar EventCardData
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
        startsAt: ev.startsAt.toISOString(),
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

    // 4. Data untuk ExplainerBand (acara unggulan dengan denah)
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

    return {
      cards,
      totalEventsCount: events.length,
      totalSoldTicketsCount,
      explainerData,
    };
  },
  ["marketplace-events-feed-v1"],
  {
    revalidate: 60, // 60 detik cache
    tags: ["events", "marketplace"],
  }
);

/**
 * Caching native Next.js untuk data detail acara publik.
 * Memuat metadata acara, zona, dan denah kursi awal dengan TTL 30 detik.
 */
export const getCachedEventDetail = unstable_cache(
  async (slug: string) => {
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: { select: { name: true } },
        zones: { orderBy: { sortOrder: "asc" } },
        seats: {
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
          },
        },
      },
    });

    return event;
  },
  ["event-detail-cache-v1"],
  {
    revalidate: 30, // 30 detik cache
    tags: ["events"],
  }
);

/**
 * Pemicu revalidasi cache manual Next.js.
 * Dipanggil ketika ada acara baru, pembaruan layout, atau publikasi acara.
 */
export async function revalidateEventsCache() {
  try {
    revalidateTag("events", { expire: 0 });
    revalidateTag("marketplace", { expire: 0 });
    revalidatePath("/", "page");
  } catch (err) {
    console.warn("[revalidateEventsCache] Gagal merevalidasi tag:", err);
  }
}
