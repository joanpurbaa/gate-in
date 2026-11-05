import Link from "next/link";
import { Ticket, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Ticket className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-700">
          404 • Halaman Tidak Ditemukan
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          Acara atau Tiket Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Tautan yang Anda buka mungkin sudah berubah atau kode tiket tidak terdaftar di sistem GateIn.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Ke Beranda Acara
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Panel Penyelenggara
          </Link>
        </div>
      </div>
    </div>
  );
}
