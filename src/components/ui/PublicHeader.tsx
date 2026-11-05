import Link from "next/link";
import { Ticket, ShieldCheck } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAFAF7]/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-stone-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3730A3] text-white shadow-xs">
            <Ticket className="h-4 w-4" />
          </span>
          <span className="text-base">GateIn</span>
          <span className="hidden rounded-md bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 sm:inline">
            Summarecon Bandung
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/"
            className="rounded-lg px-2.5 py-1.5 text-stone-700 transition hover:bg-stone-200/60"
          >
            Daftar Acara
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-stone-800 shadow-2xs transition hover:border-stone-400 hover:bg-stone-50"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#3730A3]" />
            <span>Panel Panitia</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
