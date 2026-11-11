import { Suspense } from "react";
import { HomeFeedClient } from "@/components/home/HomeFeedClient";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCachedMarketplaceData } from "@/lib/cache";

// Regenerasi berkala bawaan Next.js (ISR) setiap 60 detik untuk kecepatan loading instan
export const revalidate = 60;

export default async function HomePage() {
  const { cards, totalEventsCount, totalSoldTicketsCount, explainerData } =
    await getCachedMarketplaceData();

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
        totalEventsCount={totalEventsCount}
        totalSoldTicketsCount={totalSoldTicketsCount}
        explainerData={explainerData}
      />
    </Suspense>
  );
}
