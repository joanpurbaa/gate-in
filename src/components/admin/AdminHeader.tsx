"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Plus, ShieldCheck } from "lucide-react";

interface AdminHeaderProps {
  organizerName: string;
  organizerEmail: string;
}

export function AdminHeader({ organizerName, organizerEmail }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-stone-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3730A3] text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-sm sm:text-base">GateIn Panitia</span>
          </Link>
          <span className="hidden rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600 md:inline">
            {organizerName} ({organizerEmail})
          </span>
        </div>

        <nav className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1 rounded-lg bg-[#3730A3] px-3 py-1.5 text-white hover:bg-indigo-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Buat Acara</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-700 hover:bg-stone-100"
          >
            <span className="hidden sm:inline">Web Publik</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-700 hover:bg-rose-50 hover:text-rose-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
