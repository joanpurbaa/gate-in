"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Edit3,
  Eye,
  MapPin,
  Plus,
  QrCode,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export interface AdminEventRow {
  id: string;
  slug: string;
  name: string;
  venueName: string;
  startsAt: string;
  status: "DRAFT" | "PUBLISHED";
  totalSeats: number;
  soldSeats: number;
  heldSeats: number;
  availableSeats: number;
  checkedIn: number;
  revenue: number;
}

interface AdminEventsListProps {
  events: AdminEventRow[];
}

export function AdminEventsList({ events }: AdminEventsListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  const publishedCount = useMemo(
    () => events.filter((e) => e.status === "PUBLISHED").length,
    [events]
  );
  const draftCount = useMemo(
    () => events.filter((e) => e.status === "DRAFT").length,
    [events]
  );

  // Filter pencarian berdasarkan nama acara, nama tempat, dan status
  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      // Filter status
      if (statusFilter !== "ALL" && ev.status !== statusFilter) {
        return false;
      }
      // Filter teks
      if (!q) return true;
      const matchName = ev.name.toLowerCase().includes(q);
      const matchVenue = ev.venueName.toLowerCase().includes(q);
      const matchStatus =
        (ev.status === "PUBLISHED" && "dipublikasikan".includes(q)) ||
        (ev.status === "DRAFT" && "draf draft".includes(q));
      return matchName || matchVenue || matchStatus;
    });
  }, [events, query, statusFilter]);

  if (events.length === 0) {
    return (
      <div className="rounded-card border border-line bg-card p-8 sm:p-12 text-center shadow-2xs">
        <Sparkles className="mx-auto h-10 w-10 text-gate" />
        <h2 className="mt-3 font-display text-base sm:text-lg font-bold text-ink">
          Belum ada acara
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-muted">
          Mulai buat acara pertama. Anda dapat membuat denah kursi dari foto ruangan +
          deskripsi dengan AI maupun memakai template grid atau melingkar.
        </p>
        <Link
          href="/admin/events/new"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-button bg-gate px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-gate-strong shadow-2xs"
        >
          <Plus className="h-4 w-4" />
          <span>Buat acara pertama</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bar Pencarian & Filter Status Acara */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 sm:p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {/* Input Kolom Pencarian */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama acara, tempat, atau status..."
            className="h-10 w-full rounded-full border border-line bg-page pl-10 pr-9 text-xs sm:text-sm text-ink placeholder:text-muted focus:border-gate focus:bg-card focus:outline-none transition shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-line hover:text-ink transition"
              aria-label="Hapus kata kunci"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filter Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === "ALL"
                ? "bg-gate text-white shadow-2xs"
                : "border border-line bg-page text-muted hover:text-ink hover:bg-line/40"
            }`}
          >
            Semua ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "border border-line bg-page text-muted hover:text-ink hover:bg-line/40"
            }`}
          >
            Dipublikasikan ({publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("DRAFT")}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === "DRAFT"
                ? "bg-amber-600 text-white shadow-2xs"
                : "border border-line bg-page text-muted hover:text-ink hover:bg-line/40"
            }`}
          >
            Draf ({draftCount})
          </button>
        </div>
      </div>

      {/* Ringkasan Hasil Pencarian Jika Sedang Aktif */}
      {(query || statusFilter !== "ALL") && (
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span>
            Menampilkan <strong>{filteredEvents.length}</strong> dari {events.length} acara
            {query && (
              <>
                {" "}untuk kata kunci &ldquo;<strong className="text-ink">{query}</strong>&rdquo;
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
            }}
            className="font-semibold text-gate hover:underline text-xs"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* State Tidak Ada Acara yang Cocok */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card p-10 text-center shadow-2xs">
          <Search className="mx-auto h-8 w-8 text-muted/60" />
          <h3 className="mt-3 font-display text-base font-bold text-ink">
            Acara tidak ditemukan
          </h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            Tidak ada acara yang cocok dengan kata kunci &ldquo;{query}&rdquo; atau filter yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
            }}
            className="mt-4 inline-flex h-9 items-center rounded-button bg-gate px-4 text-xs font-bold text-white shadow-2xs hover:bg-gate-strong transition"
          >
            Tampilkan Semua Acara
          </button>
        </div>
      ) : (
        /* Daftar Kartu Acara */
        <div className="space-y-4">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="rounded-card border border-line bg-card p-4 sm:p-5 shadow-2xs transition hover:border-muted/30"
            >
              {/* Baris Atas: Status, Judul, Info Waktu & Tombol Aksi */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                        ev.status === "PUBLISHED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-line bg-page text-muted"
                      }`}
                    >
                      {ev.status === "PUBLISHED" ? "Dipublikasikan" : "Draf"}
                    </span>
                    <h2 className="font-display text-base font-bold text-ink sm:text-lg break-words">
                      {ev.name}
                    </h2>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-gate" />
                      <span>{formatDateTime(ev.startsAt)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-gate" />
                      <span className="truncate max-w-[260px] sm:max-w-none">{ev.venueName}</span>
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi Acara: Proporsional, Text 1 Baris (whitespace-nowrap), Balanced */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 lg:pt-0">
                  <Link
                    href={`/admin/events/${ev.id}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-button border border-line bg-card px-3.5 text-xs font-semibold text-ink whitespace-nowrap transition hover:bg-page hover:border-gate/40 shadow-2xs shrink-0"
                  >
                    <Eye className="h-4 w-4 text-gate shrink-0" />
                    <span>Detail & denah live</span>
                  </Link>
                  {ev.status === "PUBLISHED" && (
                    <Link
                      href={`/admin/events/${ev.id}/checkin`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-button bg-seat-checked px-3.5 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-seat-checked-edge shadow-2xs shrink-0"
                    >
                      <QrCode className="h-4 w-4 shrink-0" />
                      <span>Scan check-in</span>
                    </Link>
                  )}
                  <Link
                    href={`/admin/events/${ev.id}/edit`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-button border border-line bg-page px-3.5 text-xs font-semibold text-ink whitespace-nowrap transition hover:bg-line/60 shadow-2xs shrink-0"
                  >
                    <Edit3 className="h-4 w-4 text-muted shrink-0" />
                    <span>{ev.status === "DRAFT" ? "Lanjutkan wizard" : "Ubah"}</span>
                  </Link>
                </div>
              </div>

              {/* Grid Metrik Acara: 2 kolom di mobile, 3 di tablet (sm), 5 di desktop (lg) */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-line pt-3.5 text-xs">
                <div className="rounded-input bg-page px-3 py-2">
                  <span className="text-muted text-[11px]">Terjual</span>
                  <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                    {ev.soldSeats} / {ev.totalSeats}
                  </div>
                </div>
                <div className="rounded-input bg-page px-3 py-2">
                  <span className="text-muted text-[11px]">Sisa tersedia</span>
                  <div className="mt-0.5 font-display text-sm font-extrabold text-ink">
                    {ev.availableSeats}
                  </div>
                </div>
                <div className="rounded-input bg-page px-3 py-2">
                  <span className="text-muted text-[11px]">Sedang ditahan</span>
                  <div className="mt-0.5 font-display text-sm font-extrabold text-amber-700">
                    {ev.heldSeats}
                  </div>
                </div>
                <div className="rounded-input bg-page px-3 py-2">
                  <span className="text-muted text-[11px]">Hadir (check-in)</span>
                  <div className="mt-0.5 font-display text-sm font-extrabold text-seat-checked">
                    {ev.checkedIn} / {ev.soldSeats}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-input bg-page px-3 py-2">
                  <span className="text-muted text-[11px]">Pendapatan</span>
                  <div
                    className="mt-0.5 font-display text-sm font-extrabold text-gate truncate"
                    title={formatRupiah(ev.revenue)}
                  >
                    {formatRupiah(ev.revenue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
