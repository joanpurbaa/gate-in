"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ExternalLink, LogOut, Plus } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

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
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-ink">
            <Logo size="sm" />
            <span className="rounded-full bg-gate/10 px-2.5 py-0.5 text-xs font-semibold text-gate">
              Panitia
            </span>
          </Link>
          <span className="hidden rounded-full border border-line bg-page px-2.5 py-0.5 text-xs text-muted md:inline">
            {organizerName} ({organizerEmail})
          </span>
        </div>

        <nav className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 rounded-button border border-line bg-page px-3 py-1.5 text-ink transition hover:bg-gate/10 hover:text-gate"
          >
            <BarChart3 className="h-3.5 w-3.5 text-gate" />
            <span>Analitik Penjualan</span>
          </Link>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1 rounded-button bg-gate px-3.5 py-1.5 text-white transition hover:bg-gate-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Buat acara</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-button border border-line bg-page px-2.5 py-1.5 text-ink hover:bg-line/50"
          >
            <span className="hidden sm:inline">Web publik</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-button border border-line bg-card px-2.5 py-1.5 text-ink hover:bg-rose-50 hover:text-rose-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
