"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { isUpcomingWeekend } from "@/lib/time";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EventCard, type EventCardData } from "@/components/ui/EventCard";
import { CategoryBar } from "./CategoryBar";
import { HeroCarousel } from "./HeroCarousel";
import { ExplainerBand, type ExplainerBandProps } from "./ExplainerBand";
import { OrganizerBand } from "./OrganizerBand";

export interface HomeFeedClientProps {
  events: EventCardData[];
  totalEventsCount: number;
  totalSoldTicketsCount: number;
  explainerData: ExplainerBandProps | null;
}

export function HomeFeedClient({
  events,
  totalEventsCount,
  totalSoldTicketsCount,
  explainerData,
}: HomeFeedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("kategori") ?? null;

  // Himpunan kategori yang tersedia di database
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.category) set.add(ev.category.toUpperCase());
    }
    return set;
  }, [events]);

  const handleSelectCategory = (catSlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catSlug) {
      params.set("kategori", catSlug);
    } else {
      params.delete("kategori");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  };

  // Filter pencarian dan kategori
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter kategori
    if (categoryParam) {
      const lower = categoryParam.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.category?.toLowerCase() === lower ||
          (lower === "teknologi" && ev.category === "TECH") ||
          (lower === "musik" && ev.category === "MUSIC") ||
          (lower === "seni" && ev.category === "ARTS") ||
          (lower === "pendidikan" && ev.category === "EDUCATION") ||
          (lower === "komunitas" && ev.category === "COMMUNITY") ||
          (lower === "olahraga" && ev.category === "SPORTS")
      );
    }

    // Filter pencarian query
    if (queryParam.trim()) {
      const q = queryParam.toLowerCase().trim();
      result = result.filter(
        (ev) =>
          ev.name.toLowerCase().includes(q) ||
          ev.venueName.toLowerCase().includes(q) ||
          (ev.organizerName && ev.organizerName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [events, categoryParam, queryParam]);

  // Acara untuk Carousel Hero: hanya acara isFeatured
  const heroFeaturedEvents = useMemo(() => {
    return events.filter((ev) => ev.isFeatured);
  }, [events]);

  // Baris 1: Sedang ramai di Bandung (urut tiket terjual terbanyak)
  const popularEvents = useMemo(() => {
    return [...filteredEvents]
      .filter((ev) => ev.soldSeats > 0)
      .sort((a, b) => b.soldSeats - a.soldSeats);
  }, [filteredEvents]);

  // Baris 2: Akhir pekan ini (Jumat s/d Minggu terdekat)
  const weekendEvents = useMemo(() => {
    return filteredEvents.filter((ev) => isUpcomingWeekend(ev.startsAt));
  }, [filteredEvents]);

  // Baris 3: Segera habis (sisa kursi < 25%)
  const lowStockEvents = useMemo(() => {
    return filteredEvents.filter(
      (ev) =>
        ev.totalSeats > 0 &&
        ev.availableSeats / ev.totalSeats < 0.25 &&
        ev.saleState === "OPEN"
    );
  }, [filteredEvents]);

  const isSearchOrFiltered = Boolean(queryParam.trim() || categoryParam);

  return (
    <div className="flex flex-col">
      {/* 1. Carousel Hero (hanya saat tidak dalam pencarian) */}
      {!isSearchOrFiltered && heroFeaturedEvents.length > 0 && (
        <HeroCarousel events={heroFeaturedEvents} />
      )}

      {/* 2. Baris Filter Kategori Ikon Bulat */}
      <div className="border-y border-line/60 bg-card/40 py-2">
        <CategoryBar
          selectedCategory={categoryParam}
          onSelectCategory={handleSelectCategory}
          availableCategories={availableCategories}
        />
      </div>

      {/* 3. Strip Angka Kecil (data nyata) */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <Sparkles className="h-3.5 w-3.5 text-gate" />
          <span>
            <strong className="text-ink">{totalEventsCount} acara</strong> dibuka di Summarecon Mall Bandung
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            <strong className="text-ink">{totalSoldTicketsCount.toLocaleString("id-ID")} tiket</strong> telah terjual
          </span>
        </div>

        {isSearchOrFiltered && (
          <button
            type="button"
            onClick={() => router.push("/", { scroll: false })}
            className="text-xs font-semibold text-gate hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 sm:py-8">
        {/* Tampilan Ketika Pencarian atau Filter Aktif */}
        {isSearchOrFiltered ? (
          <section className="space-y-6">
            <SectionHeader
              title={
                queryParam.trim()
                  ? `Hasil pencarian untuk “${queryParam}”`
                  : `Acara Kategori ${categoryParam}`
              }
              subtitle={`Menampilkan ${filteredEvents.length} acara`}
            />

            {filteredEvents.length === 0 ? (
              <div className="my-10 rounded-[20px] border border-line bg-card p-10 text-center">
                <Search className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-3 text-sm font-semibold text-ink">
                  Belum ada acara yang cocok. Coba kata lain atau pilih Semua.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/", { scroll: false })}
                  className="mt-4 inline-flex items-center rounded-button bg-gate px-4 py-2 text-xs font-semibold text-white transition hover:bg-gate-strong"
                >
                  Lihat semua acara
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((ev) => (
                  <EventCard key={ev.slug} event={ev} />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Tampilan Default 3 Baris Acara Berbasis Data Nyata */
          <div className="space-y-12">
            {/* Baris 1: Sedang ramai di Bandung (minimal 3 acara) */}
            {popularEvents.length >= 3 && (
              <section aria-label="Sedang ramai di Bandung">
                <SectionHeader
                  title="Sedang ramai di Bandung"
                  subtitle="Acara dengan penjualan tiket terbanyak minggu ini."
                />
                <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                  {popularEvents.slice(0, 6).map((ev) => (
                    <div
                      key={ev.slug}
                      className="w-[78vw] flex-none snap-start sm:w-auto"
                    >
                      <EventCard event={ev} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Baris 2: Akhir pekan ini (minimal 3 acara) */}
            {weekendEvents.length >= 3 && (
              <section aria-label="Akhir pekan ini">
                <SectionHeader
                  title="Akhir pekan ini"
                  subtitle="Jadwal pertunjukan dan workshop terdekat untuk akhir pekanmu."
                />
                <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                  {weekendEvents.slice(0, 6).map((ev) => (
                    <div
                      key={ev.slug}
                      className="w-[78vw] flex-none snap-start sm:w-auto"
                    >
                      <EventCard event={ev} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Baris 3: Segera habis (minimal 3 acara) */}
            {lowStockEvents.length >= 3 && (
              <section aria-label="Segera habis">
                <SectionHeader
                  title="Segera habis"
                  subtitle="Sisa kursi di bawah 25%, pesan tempatmu sebelum kehabisan."
                />
                <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                  {lowStockEvents.slice(0, 6).map((ev) => (
                    <div
                      key={ev.slug}
                      className="w-[78vw] flex-none snap-start sm:w-auto"
                    >
                      <EventCard event={ev} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Seluruh Acara Pilihan di Summarecon Mall Bandung */}
            <section aria-label="Semua acara">
              <SectionHeader
                title="Semua acara di Summarecon Mall Bandung"
                subtitle="Jelajahi konser, seni pertunjukan, dan workshop terkurasi."
              />
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => (
                  <EventCard key={ev.slug} event={ev} />
                ))}
              </div>
            </section>

            {/* 4. Band Penjelas: Denah Asli */}
            {explainerData && (
              <ExplainerBand
                layout={explainerData.layout}
                seats={explainerData.seats}
                zones={explainerData.zones}
                eventSlug={explainerData.eventSlug}
                eventName={explainerData.eventName}
              />
            )}

            {/* 5. Band Penyelenggara */}
            <OrganizerBand />
          </div>
        )}
      </main>
    </div>
  );
}
