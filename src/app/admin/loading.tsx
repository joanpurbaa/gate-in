export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
