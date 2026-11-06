"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="rounded-card border border-rose-200 bg-card p-6">
        <h1 className="font-display text-lg font-bold text-ink">
          Terjadi kendala memuat halaman
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {error.message || "Maaf, terjadi gangguan sementara saat menghubungi server."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 min-h-12 w-full rounded-button bg-gate px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong"
        >
          Coba muat ulang
        </button>
      </div>
    </main>
  );
}
