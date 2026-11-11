"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, Search, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { authClient } from "@/lib/auth-client";

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const target = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
    setMobileSearchOpen(false);
    if (pathname !== "/" || trimmed) {
      router.push(target);
    }
  };

  const { data: session } = authClient.useSession();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0" aria-label="GateIn Beranda">
            <Logo size="md" />
          </Link>

          {/* Kolom pencarian berbentuk pil (tampil di tablet/desktop) */}
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="hidden max-w-md flex-1 md:block"
          >
            <label htmlFor="header-search-input" className="sr-only">
              Cari acara, tempat, atau penyelenggara
            </label>
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 h-4 w-4 text-muted"
              />
              <input
                id="header-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari acara, tempat, atau penyelenggara"
                className="h-10 w-full rounded-full border border-line bg-page pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-gate focus:bg-card focus:outline-none"
              />
            </div>
          </form>

          {/* Kanan desktop: chip kota + profil user/masuk */}
          <div className="hidden items-center gap-2.5 md:flex">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-page px-3.5 text-xs font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 text-gate" aria-hidden="true" />
              <span>Bandung, Summarecon</span>
            </span>

            {session?.user ? (
              <Link
                href="/my-tickets"
                title="Buka akun & tiket saya"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-page px-3 text-xs font-semibold text-ink transition hover:border-gate shadow-2xs"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Foto profil"}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gate text-[11px] font-bold text-white">
                    {(session.user.name || session.user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <span className="max-w-[140px] truncate">
                  {session.user.name || session.user.email}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-page px-4 text-xs font-semibold text-ink transition hover:border-gate hover:text-gate shadow-2xs"
              >
                <User className="h-3.5 w-3.5 text-gate" />
                <span>Masuk</span>
              </Link>
            )}
          </div>

          {/* Kanan HP (390px): avatar/login + ikon cari */}
          <div className="flex items-center gap-2 md:hidden">
            {session?.user ? (
              <Link
                href="/my-tickets"
                aria-label="Akun & Tiket Saya"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-page text-ink transition hover:bg-line/50"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Profil"}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gate text-xs font-bold text-white">
                    {(session.user.name || session.user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                aria-label="Masuk ke Akun"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-page text-ink transition hover:bg-line/50"
              >
                <User className="h-5 w-5 text-gate" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Cari acara, tempat, atau penyelenggara"
              aria-expanded={mobileSearchOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-page text-ink transition hover:bg-line/50"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Lapisan pencarian penuh di HP */}
      {mobileSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian acara"
          className="fixed inset-0 z-50 flex flex-col bg-page p-4 md:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <Logo size="sm" />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Tutup pencarian"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-4">
            <label htmlFor="mobile-search-input" className="sr-only">
              Cari acara, tempat, atau penyelenggara
            </label>
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 h-4 w-4 text-muted"
              />
              <input
                ref={mobileInputRef}
                id="mobile-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari acara, tempat, atau penyelenggara"
                className="h-12 w-full rounded-full border border-line bg-card pr-4 pl-11 text-sm text-ink placeholder:text-muted focus:border-gate focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong"
            >
              Cari acara
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 text-gate" aria-hidden="true" />
              <span>Bandung, Summarecon</span>
            </span>

            <Link
              href="/#daftar-acara"
              onClick={() => setMobileSearchOpen(false)}
              className="font-semibold text-gate hover:underline"
            >
              Lihat Semua Acara
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
