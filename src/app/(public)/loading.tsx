import { Skeleton } from "@/components/ui/Skeleton";

export default function PublicLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-card border border-line bg-card p-4"
          >
            <Skeleton rounded="input" className="aspect-[16/9] w-full" />
            <Skeleton className="mt-4 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton rounded="button" className="mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
