export default function PublicLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="h-7 w-56 animate-pulse rounded-lg bg-stone-200" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded-lg bg-stone-200" />
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"
          >
            <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-stone-200" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded-md bg-stone-200" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-stone-200" />
            <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-stone-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
