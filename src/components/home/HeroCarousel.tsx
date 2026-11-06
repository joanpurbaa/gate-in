"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import clsx from "clsx";
import { formatHeroDate } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { getCategoryInfo } from "@/components/icons/categories";
import { PosterImage } from "@/components/ui/PosterImage";
import type { EventCardData } from "@/components/ui/EventCard";

export function HeroCarousel({ events }: { events: EventCardData[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const featured = events.slice(0, 5);
  const count = featured.length;

  // Pantau apakah carousel sedang berada di viewport pengguna
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const targetIndex = (index + count) % count;
      setActiveIndex(targetIndex);
      const container = containerRef.current;
      if (!container) return;
      const slide = container.children[targetIndex] as HTMLElement | undefined;
      if (slide) {
        // HANYA menggeser internal scrollLeft kontainer carousel.
        // DILARANG memakai scrollIntoView karena akan memaksa seluruh halaman (window)
        // ter-scroll kembali ke bagian atas carousel saat pengguna membaca bagian bawah.
        const targetLeft =
          slide.offsetLeft - (container.clientWidth - slide.clientWidth) / 2;
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: "smooth",
        });
      }
    },
    [count]
  );

  // Auto-advance tiap 6 detik HANYA jika:
  // 1. Tidak di-hover/disentuh
  // 2. Carousel sedang terlihat di viewport (tidak auto-scroll saat user di bawah)
  // 3. User tidak memilih prefers-reduced-motion
  useEffect(() => {
    if (count <= 1 || isPaused || !isInView) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      scrollToIndex(activeIndex + 1);
    }, 6000);

    return () => clearInterval(interval);
  }, [activeIndex, count, isPaused, isInView, scrollToIndex]);

  // Pantau scroll manual pengguna (swipe di HP)
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    const newIdx = Math.round(scrollLeft / (width * 0.85));
    if (newIdx >= 0 && newIdx < count && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
    }
  };

  if (count === 0) return null;

  return (
    <section
      ref={sectionRef}
      aria-label="Acara unggulan"
      className="relative mx-auto w-full max-w-[1200px] overflow-hidden py-4 sm:py-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Container Slide dengan CSS Scroll-Snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:gap-6 sm:px-6"
      >
        {featured.map((ev, idx) => {
          const categoryInfo = getCategoryInfo(ev.category);
          const minPrice = ev.prices.length > 0 ? Math.min(...ev.prices) : null;
          const isPriority = idx === 0;

          return (
            <div
              key={ev.slug}
              className="relative aspect-[4/5] w-[88vw] flex-none snap-center overflow-hidden rounded-[20px] border border-line bg-ink sm:aspect-[16/7] sm:w-[92%]"
            >
              {/* Poster 16:9 atau cover */}
              <PosterImage
                src={ev.posterUrl}
                alt={ev.name}
                slug={ev.slug}
                priority={isPriority}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
                fallbackTitleSize="none"
              />

              {/* Scrim gelap di kiri (desktop) atau bawah (mobile) agar teks terbaca jelas */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/60 sm:to-transparent"
              />

              {/* Konten Slide */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white sm:justify-center sm:p-10 sm:max-w-[65%]">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryInfo && (
                    <span className="inline-flex items-center rounded-full bg-sand/20 px-3 py-1 text-xs font-semibold text-sand backdrop-blur-md">
                      {categoryInfo.name}
                    </span>
                  )}
                  {ev.organizerName && (
                    <span className="text-xs text-white/80">
                      Oleh {ev.organizerName}
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {ev.name}
                </h2>

                <p className="mt-2 text-xs font-medium text-white/90 sm:text-sm">
                  {formatHeroDate(ev.startsAt)} • {ev.venueName}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 pt-1 sm:mt-6">
                  {minPrice !== null && (
                    <div>
                      <span className="block text-[11px] text-white/70">Mulai dari</span>
                      <span className="font-display text-base font-extrabold text-ticket sm:text-xl">
                        {formatRupiah(minPrice)}
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/e/${ev.slug}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-button bg-gate px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gate-strong"
                  >
                    Pilih kursi
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Titik Indikator Pagination (tanpa tombol panah skip) */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {featured.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Pindah ke slide ${idx + 1}`}
              className={clsx(
                "h-2 rounded-full transition-all duration-300",
                activeIndex === idx ? "w-6 bg-gate" : "w-2 bg-line hover:bg-muted"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
