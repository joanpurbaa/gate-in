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
      <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-xs">
        <h1 className="text-lg font-bold text-stone-900">Terjadi Kendala Memuat Halaman</h1>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          {error.message || "Maaf, terjadi gangguan sementara saat menghubungi server."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 min-h-11 w-full rounded-xl bg-[#3730A3] px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-900"
        >
          Coba Muat Ulang
        </button>
      </div>
    </main>
  );
}
