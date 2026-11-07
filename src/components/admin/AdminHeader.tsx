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

  const userInitial = organizerName ? organizerName.trim().charAt(0).toUpperCase() : "P";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Sisi Kiri: Logo Brand & Navigasi Desktop */}
          <div className="flex items-center gap-6 shrink-0">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 font-bold text-ink shrink-0 group focus:outline-none"
            >
              <Logo size="sm" />
              <span className="rounded-full bg-gate/10 border border-gate/20 px-2.5 py-0.5 text-[11px] font-bold text-gate tracking-wide">
                Panitia
              </span>
            </Link>

            {/* Menu Navigasi Desktop: 1 Baris Rapi, Bersih, Tanpa Wrap */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      item.active
                        ? "bg-gate/10 text-gate font-bold"
                        : "text-muted hover:bg-page hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sisi Kanan: Aksi Cepat & Profil Akun (Desktop) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-1.5 rounded-button bg-gate px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-gate-strong shadow-2xs shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Buat acara</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-button border border-line bg-page px-3 py-2 text-xs font-semibold text-ink whitespace-nowrap transition hover:bg-line/50 shrink-0"
              title="Buka Website Publik GateIn di tab baru"
            >
              <span>Web publik</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted shrink-0" />
            </Link>

            <div className="h-5 w-px bg-line mx-1 shrink-0" />

            {/* Profil Penyelenggara di Ujung Kanan */}
            <div
              className="flex items-center gap-2.5 rounded-full border border-line bg-page/80 py-1 pl-1.5 pr-3 text-xs shrink-0"
              title={`${organizerName} (${organizerEmail})`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gate text-white font-bold text-xs shrink-0 shadow-2xs">
                {userInitial}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-ink max-w-[140px] truncate leading-tight">
                  {organizerName}
                </span>
                <span className="text-[10px] text-muted max-w-[140px] truncate leading-tight">
                  {organizerEmail}
                </span>
              </div>
            </div>

            {/* Tombol Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-button border border-line bg-card text-muted transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shrink-0"
              title="Keluar dari akun panitia"
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4 shrink-0" />
            </button>
          </div>

          {/* Sisi Kanan: Tampilan Mobile (< 768px) */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <Link
              href="/admin/events/new"
              className="inline-flex items-center gap-1 rounded-button bg-gate px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gate-strong shadow-2xs whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Buat acara</span>
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

        {/* Dropdown Menu Mobile (< 768px) */}
        {mobileMenuOpen && (
          <div className="border-t border-line bg-card px-4 py-4 shadow-xl md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Info Profil Penyelenggara */}
            <div className="mb-4 flex items-center gap-3 rounded-card border border-line bg-page p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gate text-white font-bold text-sm shadow-2xs">
                {userInitial}
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

            {/* Navigasi Utama */}
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
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
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
          className="fixed inset-0 z-20 bg-ink/20 backdrop-blur-2xs md:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
