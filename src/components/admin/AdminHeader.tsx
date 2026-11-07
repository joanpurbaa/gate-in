"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  Tag,
  User,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface AdminHeaderProps {
  organizerName: string;
  organizerEmail: string;
}

export function AdminHeader({ organizerName, organizerEmail }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tutup menu jika menekan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const navLinks = [
    {
      href: "/admin",
      label: "Dasbor Acara",
      icon: Calendar,
      active: pathname === "/admin",
    },
    {
      href: "/admin/analytics",
      label: "Analitik Penjualan",
      icon: BarChart3,
      active: pathname.startsWith("/admin/analytics"),
    },
    {
      href: "/admin/promos",
      label: "Kode Promo",
      icon: Tag,
      active: pathname.startsWith("/admin/promos"),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          {/* Sisi Kiri: Logo & Badge Panitia */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-ink">
              <Logo size="sm" />
              <span className="rounded-full bg-gate/10 px-2.5 py-0.5 text-xs font-semibold text-gate">
                Panitia
              </span>
            </Link>

            {/* Nama Penyelenggara (Hanya tampil di layar desktop lebar agar tidak sesak di tablet) */}
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-0.5 text-xs text-muted max-w-[280px] truncate">
              <span className="font-semibold text-ink truncate">{organizerName}</span>
              <span className="text-muted/60">({organizerEmail})</span>
            </span>
          </div>

          {/* Sisi Kanan: Navigasi Desktop Penuh (Layar Desktop >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-2 text-xs font-semibold">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 transition ${
                    item.active
                      ? "border-gate/20 bg-gate/10 text-gate font-bold"
                      : "border-line bg-page text-ink hover:bg-gate/5 hover:text-gate"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-1.5 rounded-button bg-gate px-3.5 py-1.5 text-white transition hover:bg-gate-strong shadow-2xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Buat acara</span>
            </Link>

            <div className="h-4 w-px bg-line mx-1" />

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-button border border-line bg-page px-2.5 py-1.5 text-ink transition hover:bg-line/50"
              title="Buka Website Publik GateIn"
            >
              <span>Web publik</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-button border border-line bg-card px-2.5 py-1.5 text-ink transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
              title="Keluar dari akun panitia"
            >
              <LogOut className="h-3.5 w-3.5 text-muted hover:text-rose-700" />
              <span>Keluar</span>
            </button>
          </nav>

          {/* Sisi Kanan: Tampilan Tablet & Mobile (< 1024px) */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-1 rounded-button bg-gate px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gate-strong shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buat acara</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-line bg-page text-ink transition hover:bg-line/50"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 text-ink" />
              ) : (
                <Menu className="h-4 w-4 text-ink" />
              )}
            </button>
          </div>
        </div>

        {/* Dropdown Menu Mobile & Tablet (< 1024px) */}
        {mobileMenuOpen && (
          <div className="border-t border-line bg-card px-4 py-4 shadow-xl lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Info Profil Penyelenggara */}
            <div className="mb-4 flex items-center gap-3 rounded-card border border-line bg-page p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gate/10 text-gate font-bold text-sm">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-ink text-sm truncate">
                  {organizerName}
                </div>
                <div className="text-xs text-muted truncate">{organizerEmail}</div>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shrink-0">
                Panitia
              </span>
            </div>

            {/* Daftar Navigasi Utama */}
            <div className="space-y-1.5 text-sm font-semibold">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 rounded-button px-3.5 py-2.5 transition ${
                      item.active
                        ? "bg-gate text-white font-bold shadow-2xs"
                        : "text-ink hover:bg-page"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/admin/events/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-button border border-gate/20 bg-gate/5 px-3.5 py-2.5 text-gate font-bold transition hover:bg-gate/10"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Acara Baru</span>
              </Link>

              <div className="my-2 border-t border-line pt-2">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-button px-3.5 py-2.5 text-muted hover:bg-page hover:text-ink transition"
                >
                  <span className="flex items-center gap-2.5">
                    <ExternalLink className="h-4 w-4" />
                    <span>Buka Web Publik GateIn</span>
                  </span>
                  <span className="text-[11px] font-normal text-muted">Tab baru ↗</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-button px-3.5 py-2.5 text-rose-700 hover:bg-rose-50 transition font-semibold mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Overlay Backdrop jika menu mobile terbuka */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-ink/20 backdrop-blur-2xs lg:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
