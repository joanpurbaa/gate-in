import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { computeSaleState } from "@/components/ui/StatusPill";
import type { EventCardData } from "@/components/ui/EventCard";
import type { ExplainerBandProps } from "@/components/home/ExplainerBand";
import type { LayoutV1 } from "@/lib/layout/types";

/**
 * Tag dan konstanta waktu revalidasi (TTL dalam detik) bawaan Next.js.
 */
export const CACHE_TAGS = {
  marketplace: "marketplace",
  events: "events",
  event: (slug: string) => `event-${slug}`,
} as const;

export const CACHE_TTL = {
  marketplace: 60, // 60 detik untuk beranda marketplace
  eventDetail: 30, // 30 detik untuk halaman detail acara
  bookingEvent: 15, // 15 detik untuk layout & zona di halaman pesan
} as const;

/**
 * Interface data publik beranda marketplace yang telah diproses dan di-cache.
 */
export interface CachedMarketplacePayload {
  cards: EventCardData[];
  totalEventsCount: number;
  totalSoldTicketsCount: number;
  explainerData: ExplainerBandProps | null;
}

interface L1CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// L1 Memory Cache di Node RAM (sub-milidetik untuk request pada proses yang sama)
const l1MemoryCache = new Map<string, L1CacheEntry<unknown>>();

function getFromL1<T>(key: string): T | null {
  const entry = l1MemoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setToL1<T>(key: string, data: T, ttlSeconds: number): void {
  l1MemoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Wrapper pembantu untuk menjalankan query dengan Next.js Data Cache (unstable_cache)
 * dengan fallback aman bila dieksekusi di luar konteks request Next.js (mis. standalone scripts).
 */
function createCachedQuery<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyParts: string[],
  options?: { revalidate?: number; tags?: string[] }
): (...args: Args) => Promise<T> {
  const cachedFn = unstable_cache(fn, keyParts, options);

  return async (...args: Args): Promise<T> => {
    try {
      return await cachedFn(...args);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("incrementalCache missing")) {
        return await fn(...args);
      }
      throw err;
    }
  };
}

/**
 * Internal fetcher untuk kueri agregasi beranda marketplace.
 */
async function fetchMarketplaceDataInternal(): Promise<CachedMarketplacePayload> {
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
}

const getCachedMarketplaceDataL2 = createCachedQuery(
  fetchMarketplaceDataInternal,
  ["marketplace-feed-v3"],
  {
    revalidate: CACHE_TTL.marketplace,
    tags: [CACHE_TAGS.marketplace, CACHE_TAGS.events],
  }
);

/**
 * Caching bertingkat untuk data beranda marketplace (TTL 60 detik).
 * L1: Memory cache RAM proses (0ms)
 * L2: Next.js Data Cache bawaan (unstable_cache)
 */
export async function getCachedMarketplaceData(): Promise<CachedMarketplacePayload> {
  const l1Key = "marketplace_feed_l1";
  const fromL1 = getFromL1<CachedMarketplacePayload>(l1Key);
  if (fromL1) return fromL1;

  const data = await getCachedMarketplaceDataL2();
  setToL1(l1Key, data, CACHE_TTL.marketplace);
  return data;
}

/**
 * Internal fetcher untuk detail acara.
 */
async function fetchEventDetailInternal(slug: string) {
  return prisma.event.findUnique({
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
}

/**
 * Caching data detail acara publik (TTL 30 detik).
 * Menggunakan unstable_cache Next.js + tags per-slug untuk revalidasi tepat sasaran.
 */
export async function getCachedEventDetail(slug: string) {
  const l1Key = `event_detail_${slug}`;
  const fromL1 = getFromL1<Awaited<ReturnType<typeof fetchEventDetailInternal>>>(l1Key);
  if (fromL1) return fromL1;

  const cachedQuery = createCachedQuery(
    async () => fetchEventDetailInternal(slug),
    [`event-detail-v3-${slug}`],
    {
      revalidate: CACHE_TTL.eventDetail,
      tags: [CACHE_TAGS.events, CACHE_TAGS.event(slug)],
    }
  );

  const data = await cachedQuery();
  if (data) {
    setToL1(l1Key, data, CACHE_TTL.eventDetail);
  }
  return data;
}

/**
 * Internal fetcher untuk data acara pada halaman booking (/e/[slug]/beli).
 * Meng-cache layout dan definisi zona yang statis (TTL 15 detik).
 */
async function fetchBookingEventInternal(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      seats: {
        orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
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
      },
    },
  });
}

/**
 * Caching data layout & zona untuk alur pemesanan (/beli).
 */
export async function getCachedBookingEvent(slug: string) {
  const l1Key = `event_booking_${slug}`;
  const fromL1 = getFromL1<Awaited<ReturnType<typeof fetchBookingEventInternal>>>(l1Key);
  if (fromL1) return fromL1;

  const cachedQuery = createCachedQuery(
    async () => fetchBookingEventInternal(slug),
    [`event-booking-v3-${slug}`],
    {
      revalidate: CACHE_TTL.bookingEvent,
      tags: [CACHE_TAGS.events, CACHE_TAGS.event(slug)],
    }
  );

  const data = await cachedQuery();
  if (data) {
    setToL1(l1Key, data, CACHE_TTL.bookingEvent);
  }
  return data;
}

/**
 * Pemicu revalidasi cache on-demand bawaan Next.js.
 * Dipanggil otomatis saat admin membuat acara baru, memperbarui layout, mengubah harga, atau mempublikasikan acara.
 */
export async function revalidateEventsCache(slug?: string): Promise<void> {
  // 1. Bersihkan L1 memory cache
  l1MemoryCache.clear();

  try {
    // 2. Revalidasi tag data cache Next.js (profil expire: 0 untuk pembersihan instan)
    revalidateTag(CACHE_TAGS.marketplace, { expire: 0 });
    revalidateTag(CACHE_TAGS.events, { expire: 0 });

    // 3. Revalidasi halaman rute beranda
    revalidatePath("/");

    // 4. Jika ada slug spesifik, revalidasi halaman acara tersebut
    if (slug) {
      revalidateTag(CACHE_TAGS.event(slug), { expire: 0 });
      revalidatePath(`/e/${slug}`);
      revalidatePath(`/e/${slug}/beli`);
    }
  } catch (err) {
    // Abaikan jika dipanggil saat build atau di luar konteks request Next.js
    console.warn("[Cache] Catatan revalidasi:", err);
  }
}
