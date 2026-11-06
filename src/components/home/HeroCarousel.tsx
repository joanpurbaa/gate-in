"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { formatHeroDate } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { getCategoryInfo } from "@/components/icons/categories";
import { PosterImage } from "@/components/ui/PosterImage";
import type { EventCardData } from "@/components/ui/EventCard";

export function HeroCarousel({ events }: { events: EventCardData[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const featured = events.slice(0, 5);
  const count = featured.length;

  const scrollToIndex = useCallback(
    (index: number) => {
      const targetIndex = (index + count) % count;
      setActiveIndex(targetIndex);
      const container = containerRef.current;
      if (!container) return;
      const slide = container.children[targetIndex] as HTMLElement | undefined;
      if (slide) {
        slide.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    },
    [count]
  );

  // Auto-advance tiap 6 detik kecuali di-hover, disentuh, atau user memilih reduced motion
  useEffect(() => {
    if (count <= 1 || isPaused) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      scrollToIndex(activeIndex + 1);
    }, 6000);

    return () => clearInterval(interval);
  }, [activeIndex, count, isPaused, scrollToIndex]);

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

      {/* Navigasi Panah Desktop */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            aria-label="Slide sebelumnya"
            className="absolute top-1/2 left-2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card/90 p-2.5 text-ink shadow-md backdrop-blur-sm transition hover:bg-card focus-visible:ring-2 focus-visible:ring-gate sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            aria-label="Slide berikutnya"
            className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card/90 p-2.5 text-ink shadow-md backdrop-blur-sm transition hover:bg-card focus-visible:ring-2 focus-visible:ring-gate sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Titik Indikator Pagination */}
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
