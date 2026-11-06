import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-8">
        <div className="mb-4 flex justify-center">
          <Logo size="md" />
        </div>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">
          Acara atau tiket tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tautan yang kamu buka mungkin sudah berubah atau kode tiket tidak terdaftar di GateIn.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-gate px-6 text-sm font-semibold text-white transition hover:bg-gate-strong sm:min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Acara</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
