"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">
          Terjadi kendala di panel penyelenggara
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {error.message || "Gagal memuat halaman admin. Silakan muat ulang atau kembali ke dasbor."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-button bg-gate px-4 text-sm font-semibold text-white transition hover:bg-gate-strong"
          >
            <RotateCcw className="h-4 w-4" />
            Coba lagi
          </button>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-button border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-page"
          >
            Dasbor admin
          </Link>
        </div>
      </div>
    </div>
  );
}
