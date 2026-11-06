"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Download,
  Flame,
  Layers,
  Minus,
  RefreshCw,
  Ticket,
  TrendingUp,
} from "lucide-react";
import type {
  AnalyticsFilter,
  AnalyticsGranularity,
  AnalyticsPeriod,
  SalesPerformanceAnalyticsResult,
} from "@/lib/analytics/types";
import { formatRupiah } from "@/lib/money";

interface EventOption {
  id: string;
  name: string;
  slug: string;
  status: string;
  startsAt: string;
}

interface AnalyticsClientProps {
  initialData: SalesPerformanceAnalyticsResult;
  events: EventOption[];
}

export function AnalyticsClient({ initialData, events }: AnalyticsClientProps) {
  const [data, setData] = useState<SalesPerformanceAnalyticsResult>(initialData);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialData.selectedEventId || ""
  );
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialData.period);
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(
    initialData.granularity
  );
  const [compareWithPrevious, setCompareWithPrevious] = useState<boolean>(true);

  const [isPending, startTransition] = useTransition();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Fungsi reload data saat filter berubah
  const applyFilter = (newFilter: Partial<AnalyticsFilter>) => {
    const nextEventId =
      newFilter.eventId !== undefined ? newFilter.eventId : selectedEventId;
    const nextPeriod = newFilter.period || period;
    const nextGranularity = newFilter.granularity || granularity;
    const nextCompare =
      newFilter.compareWithPrevious !== undefined
        ? newFilter.compareWithPrevious
        : compareWithPrevious;

    if (newFilter.eventId !== undefined) setSelectedEventId(newFilter.eventId);
    if (newFilter.period) setPeriod(newFilter.period);
    if (newFilter.granularity) setGranularity(newFilter.granularity);
    if (newFilter.compareWithPrevious !== undefined)
      setCompareWithPrevious(newFilter.compareWithPrevious);

    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (nextEventId) params.set("eventId", nextEventId);
        params.set("period", nextPeriod);
        params.set("granularity", nextGranularity);
        params.set("compare", nextCompare ? "true" : "false");

        const res = await fetch(`/api/admin/analytics?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal memuat analitik");
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi filter analitik:", err);
      }
    });
  };

  // Kalkulasi grafik tren penjualan
  const maxRevenuePoint = Math.max(
    1,
    ...data.salesTrend.map((p) => p.revenue)
  );

  const maxHourlyCount = Math.max(
    1,
    ...data.velocity.hourly.map((h) => h.ticketCount)
  );

  const maxCheckInCount = Math.max(
    1,
    ...data.attendance.hourlyCheckIns.map((h) => h.count)
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-7 pb-20">
      {/* Header Halaman & Navigasi */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Dasbor Utama</span>
          </Link>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
              Analitik Kinerja Penjualan
            </h1>
            {isPending && (
              <RefreshCw className="h-4 w-4 animate-spin text-gate" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Insight mendalam transaksi, kecepatan penjualan, keterisian kursi, dan kehadiran pengunjung.
          </p>
        </div>

        {/* Tombol Ekspor CSV */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportMenuOpen((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-ink shadow-xs transition hover:bg-page"
          >
            <Download className="h-4 w-4 text-gate" />
            <span>Ekspor Laporan (CSV)</span>
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-2 z-30 w-64 rounded-xl border border-line bg-card p-1.5 shadow-xl animate-in fade-in duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                Pilih Format Ekspor
              </div>
              <a
                href={`/api/admin/analytics/export?type=sales-summary&eventId=${selectedEventId}&period=${period}`}
                onClick={() => setExportMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-page transition"
              >
                <TrendingUp className="h-3.5 w-3.5 text-gate" />
                <span>Ringkasan Penjualan (Harian)</span>
              </a>
              <a
                href={`/api/admin/analytics/export?type=zone-performance&eventId=${selectedEventId}&period=${period}`}
                onClick={() => setExportMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-page transition"
              >
                <Layers className="h-3.5 w-3.5 text-gate" />
                <span>Kinerja per Zona Tiket</span>
              </a>
              <a
                href={`/api/admin/analytics/export?type=attendance&eventId=${selectedEventId}`}
                onClick={() => setExportMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-page transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-gate" />
                <span>Laporan Kehadiran & Check-in</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bar Filter Interaktif */}
      <section className="rounded-2xl border border-line bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Acara */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-xs font-semibold text-muted">Acara:</span>
            <select
              value={selectedEventId}
              onChange={(e) => applyFilter({ eventId: e.target.value })}
              className="min-h-10 w-full rounded-xl border border-line bg-page px-3 text-xs font-bold text-ink focus:border-gate focus:outline-none"
            >
              <option value="">Semua Acara ({events.length})</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.status === "PUBLISHED" ? "Live" : "Draf"})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Rentang Waktu */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-page p-1 text-xs">
            {(["7d", "30d", "90d", "all"] as AnalyticsPeriod[]).map((p) => {
              const label =
                p === "7d"
                  ? "7 Hari"
                  : p === "30d"
                    ? "30 Hari"
                    : p === "90d"
                      ? "90 Hari"
                      : "Semua";
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyFilter({ period: p })}
                  className={`rounded-lg px-3 py-1.5 font-bold transition ${
                    period === p
                      ? "bg-gate text-white shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Filter Granularitas */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-page p-1 text-xs">
            {(["daily", "weekly", "monthly"] as AnalyticsGranularity[]).map(
              (g) => {
                const label =
                  g === "daily" ? "Harian" : g === "weekly" ? "Mingguan" : "Bulanan";
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => applyFilter({ granularity: g })}
                    className={`rounded-lg px-3 py-1.5 font-bold transition ${
                      granularity === g
                        ? "bg-card text-ink shadow-xs border border-line"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              }
            )}
          </div>

          {/* Toggle Komparasi */}
          {period !== "all" && (
            <label className="flex items-center gap-2 text-xs font-semibold text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compareWithPrevious}
                onChange={(e) =>
                  applyFilter({ compareWithPrevious: e.target.checked })
                }
                className="h-4 w-4 rounded-md border-line text-gate focus:ring-gate"
              />
              <span>Bandingkan periode sebelumnya</span>
            </label>
          )}
        </div>
      </section>

      {/* Bagian 1: Ringkasan Metrik Kunci (Overview) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold">Gross Revenue</span>
            <TrendingUp className="h-4 w-4 text-gate" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
            {formatRupiah(data.overview.grossRevenue.value)}
          </div>
          {compareWithPrevious && period !== "all" && (
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              {data.overview.grossRevenue.trend === "up" ? (
                <span className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  +{data.overview.grossRevenue.percentageChange}%
                </span>
              ) : data.overview.grossRevenue.trend === "down" ? (
                <span className="inline-flex items-center font-bold text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {data.overview.grossRevenue.percentageChange}%
                </span>
              ) : (
                <span className="inline-flex items-center font-semibold text-muted">
                  <Minus className="h-3.5 w-3.5" />
                  0%
                </span>
              )}
              <span className="text-muted">vs periode lalu</span>
            </div>
          )}
        </div>

        {/* Tiket Terjual */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold">Tiket Terjual</span>
            <Ticket className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
            {data.overview.ticketsSold.value.toLocaleString("id-ID")}
          </div>
          {compareWithPrevious && period !== "all" && (
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              {data.overview.ticketsSold.trend === "up" ? (
                <span className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  +{data.overview.ticketsSold.percentageChange}%
                </span>
              ) : data.overview.ticketsSold.trend === "down" ? (
                <span className="inline-flex items-center font-bold text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {data.overview.ticketsSold.percentageChange}%
                </span>
              ) : (
                <span className="inline-flex items-center font-semibold text-muted">
                  <Minus className="h-3.5 w-3.5" />
                  0%
                </span>
              )}
              <span className="text-muted">vs periode lalu</span>
            </div>
          )}
        </div>

        {/* Transaksi Berhasil */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold">Transaksi Berhasil</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
            {data.overview.paidOrders.value.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Rata-rata {data.overview.averageTicketsPerOrder} tiket/pesanan
          </div>
        </div>

        {/* Rata-Rata Nilai Transaksi (AOV) */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold">Avg. Order Value</span>
            <BarChart2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
            {formatRupiah(data.overview.averageOrderValue.value)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Keterisian: <strong>{data.overview.occupancyRate}%</strong>
          </div>
        </div>
      </section>

      {/* Bagian 2: Actionable Insights Berbasis Data Aktual */}
      {data.insights.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <Flame className="h-4 w-4 text-gate" />
            <span>Actionable Insights & Rekomendasi</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-2xl border p-4 text-xs transition shadow-xs ${
                  insight.type === "success"
                    ? "border-emerald-500/30 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200"
                    : insight.type === "warning"
                      ? "border-amber-500/30 bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200"
                      : insight.type === "trend"
                        ? "border-indigo-500/30 bg-indigo-50/70 text-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-200"
                        : "border-gate/20 bg-gate/5 text-ink"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{insight.title}</span>
                  {insight.metric && (
                    <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold shadow-xs">
                      {insight.metric}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed opacity-90">
                  {insight.message}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bagian 3: Sales Trend Chart */}
      <section className="rounded-2xl border border-line bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Tren Penjualan & Pendapatan
            </h2>
            <p className="text-xs text-muted">
              Distribusi pendapatan dari transaksi yang berhasil dibayar ({data.salesTrend.length} periode waktu).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-gate" />
              <span>Gross Revenue (Rp)</span>
            </span>
          </div>
        </div>

        {/* Visualisasi Bar Chart Responsif */}
        {data.salesTrend.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">
            Belum ada data penjualan pada rentang waktu yang dipilih.
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex h-56 items-end gap-1.5 sm:gap-2.5 overflow-x-auto pb-4 pt-6">
              {data.salesTrend.map((point, idx) => {
                const heightPercent =
                  maxRevenuePoint > 0
                    ? Math.max(8, Math.round((point.revenue / maxRevenuePoint) * 100))
                    : 8;

                const isHovered = hoveredPoint === idx;

                return (
                  <div
                    key={point.dateKey}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="group relative flex flex-1 min-w-[28px] max-w-[48px] flex-col items-center h-full justify-end cursor-pointer"
                  >
                    {/* Tooltip Hover */}
                    {isHovered && (
                      <div className="absolute -top-16 z-20 whitespace-nowrap rounded-xl border border-line bg-card p-2 text-center text-[11px] shadow-xl pointer-events-none">
                        <div className="font-bold text-ink">{point.label}</div>
                        <div className="font-extrabold text-gate">
                          {formatRupiah(point.revenue)}
                        </div>
                        <div className="text-[10px] text-muted">
                          {point.ticketCount} tiket ({point.orderCount} order)
                        </div>
                      </div>
                    )}

                    {/* Bar Pendapatan */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition duration-200 ${
                        point.revenue > 0
                          ? isHovered
                            ? "bg-gate-strong"
                            : "bg-gate hover:bg-gate-strong"
                          : "bg-line/40"
                      }`}
                    />

                    {/* Label Bawah */}
                    <span className="mt-2 text-[10px] font-medium text-muted truncate max-w-full text-center">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Bagian 4: Sales by Ticket Zone */}
      <section className="rounded-2xl border border-line bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Kinerja Penjualan per Zona Tiket
            </h2>
            <p className="text-xs text-muted">
              Rincian kontribusi pendapatan, tiket terjual, dan sisa kuota kursi per kategori.
            </p>
          </div>
          <div className="text-xs font-bold text-gate">
            {data.zones.length} Zona Terpantau
          </div>
        </div>

        {/* Stacked Proportional Bar Kontribusi */}
        {data.zones.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold text-muted">
              Proporsi Kontribusi Pendapatan per Zona
            </div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-line/40">
              {data.zones.map((z) => (
                <div
                  key={z.zoneId}
                  title={`${z.zoneName}: ${z.revenueShare}%`}
                  style={{
                    width: `${z.revenueShare}%`,
                    backgroundColor: z.zoneColor,
                  }}
                  className="transition-all duration-300 hover:opacity-85"
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabel / Grid Performa Zona */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.zones.map((zone) => (
            <div
              key={zone.zoneId}
              className="rounded-xl border border-line bg-page p-4 text-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: zone.zoneColor }}
                  />
                  <span className="font-bold text-ink">{zone.zoneName}</span>
                </div>
                <span className="font-display font-extrabold text-ink">
                  {formatRupiah(zone.price)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-line/60 pt-2.5">
                <div>
                  <span className="text-muted">Tiket Terjual:</span>
                  <div className="font-bold text-ink">
                    {zone.ticketsSold} / {zone.totalQuota}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Sisa Kuota:</span>
                  <div className="font-bold text-gate">
                    {zone.availableQuota} kursi
                  </div>
                </div>
                <div>
                  <span className="text-muted">Gross Revenue:</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(zone.revenue)}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Share Pendapatan:</span>
                  <div className="font-bold text-ink">{zone.revenueShare}%</div>
                </div>
              </div>

              {/* Progress Keterisian Kursi */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-muted">
                  <span>Keterisian Kursi</span>
                  <span>{zone.occupancyRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-card">
                  <div
                    style={{ width: `${Math.min(100, zone.occupancyRate)}%` }}
                    className="h-full rounded-full bg-gate transition-all"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bagian 5: Sales Velocity (Kecepatan & Jam Paling Aktif) */}
      <section className="rounded-2xl border border-line bg-card p-5 shadow-xs space-y-6">
        <div className="border-b border-line pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Kecepatan Penjualan (Sales Velocity)
              </h2>
              <p className="text-xs text-muted">
                Memahami pola jam pembelian dan momentum transaksi mendekati hari acara.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink">
                Rata-rata: {data.velocity.averageTicketsPerDay} tiket / hari
              </span>
            </div>
          </div>
        </div>

        {/* Distribusi per Jam (00 - 23 WIB) */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink">
              Distribusi Transaksi per Jam (WIB)
            </span>
            <span className="text-muted text-[11px]">
              Jam Puncak:{" "}
              <strong className="text-gate font-bold">
                {data.velocity.peakHour.hourLabel} WIB (
                {data.velocity.peakHour.ticketCount} tiket)
              </strong>
            </span>
          </div>

          <div className="mt-3 flex h-28 items-end gap-1 overflow-x-auto pb-2">
            {data.velocity.hourly.map((h) => {
              const heightPercent =
                maxHourlyCount > 0
                  ? Math.max(6, Math.round((h.ticketCount / maxHourlyCount) * 100))
                  : 6;
              const isPeak = h.hour === data.velocity.peakHour.hour && h.ticketCount > 0;

              return (
                <div
                  key={h.hour}
                  title={`${h.hourLabel} WIB: ${h.ticketCount} tiket (${h.orderCount} transaksi)`}
                  className="group relative flex flex-1 min-w-[14px] flex-col items-center h-full justify-end cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-sm transition ${
                      isPeak
                        ? "bg-gate-strong"
                        : h.ticketCount > 0
                          ? "bg-gate/70 hover:bg-gate"
                          : "bg-line/40"
                    }`}
                  />
                  {h.hour % 3 === 0 && (
                    <span className="mt-1 text-[9px] text-muted">{h.hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 Kolom: Hari Paling Aktif & Tren Mendekati Hari H */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-line">
          {/* Hari dalam Seminggu */}
          <div className="rounded-xl border border-line bg-page p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Hari Paling Ramai</span>
              <span className="font-extrabold text-gate">
                {data.velocity.peakDay.dayName} ({data.velocity.peakDay.ticketCount} tiket)
              </span>
            </div>
            <div className="space-y-1.5">
              {data.velocity.daysOfWeek.map((day) => {
                const maxDay = Math.max(
                  1,
                  ...data.velocity.daysOfWeek.map((d) => d.ticketCount)
                );
                const percent = Math.round((day.ticketCount / maxDay) * 100);

                return (
                  <div key={day.dayIndex} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 text-muted">{day.dayName}</span>
                    <div className="flex-1 h-2 rounded-full bg-card overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${
                          day.dayName === data.velocity.peakDay.dayName && day.ticketCount > 0
                            ? "bg-gate"
                            : "bg-gate/40"
                        }`}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-ink">
                      {day.ticketCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tren Penjualan Mendekati Hari Acara */}
          <div className="rounded-xl border border-line bg-page p-4 text-xs space-y-3">
            <span className="font-bold text-ink">
              Tren Penjualan Mendekati Hari H Acara
            </span>
            <div className="space-y-2">
              {data.velocity.daysBeforeEvent.map((b) => (
                <div key={b.bucketLabel} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-muted">
                    <span>{b.bucketLabel}</span>
                    <span className="font-semibold text-ink">
                      {b.ticketCount} tiket ({b.share}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-card overflow-hidden">
                    <div
                      style={{ width: `${b.share}%` }}
                      className="h-full rounded-full bg-indigo-500 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bagian 6: Keterisian Kursi (Occupancy) & Kehadiran (Attendance) */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Keterisian Kursi (Seat Occupancy) */}
        <div className="rounded-2xl border border-line bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-ink">
                Keterisian Kursi (Seat Occupancy)
              </h3>
              <p className="text-[11px] text-muted">
                Status kursi aktual denah sesuai aturan transaksi.
              </p>
            </div>
            <div className="font-display text-xl font-extrabold text-gate">
              {data.occupancy.occupancyRate}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-muted">Total Kapasitas</span>
              <div className="font-bold text-ink text-base">
                {data.occupancy.totalCapacity} kursi
              </div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-muted">Kursi Terjual (SOLD)</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {data.occupancy.soldSeats} kursi
              </div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-muted">Sedang Di-hold (HELD)</span>
              <div className="font-bold text-amber-600 dark:text-amber-400 text-base">
                {data.occupancy.heldSeats} kursi
              </div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-muted">Tersedia (AVAILABLE)</span>
              <div className="font-bold text-gate text-base">
                {data.occupancy.availableSeats} kursi
              </div>
            </div>
          </div>

          {/* Progress Bar 3 Segmen */}
          <div className="space-y-1.5 pt-1">
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-page">
              <div
                title={`Terjual: ${data.occupancy.soldSeats}`}
                style={{
                  width: `${
                    data.occupancy.totalCapacity > 0
                      ? (data.occupancy.soldSeats / data.occupancy.totalCapacity) * 100
                      : 0
                  }%`,
                }}
                className="bg-emerald-500"
              />
              <div
                title={`Di-hold: ${data.occupancy.heldSeats}`}
                style={{
                  width: `${
                    data.occupancy.totalCapacity > 0
                      ? (data.occupancy.heldSeats / data.occupancy.totalCapacity) * 100
                      : 0
                  }%`,
                }}
                className="bg-amber-500"
              />
              <div
                title={`Tersedia: ${data.occupancy.availableSeats}`}
                style={{
                  width: `${
                    data.occupancy.totalCapacity > 0
                      ? (data.occupancy.availableSeats / data.occupancy.totalCapacity) * 100
                      : 0
                  }%`,
                }}
                className="bg-line"
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Terjual
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Di-hold
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-line" /> Tersedia
              </span>
            </div>
          </div>
        </div>

        {/* Kehadiran & Check-in (Attendance Analytics) */}
        <div className="rounded-2xl border border-line bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-ink">
                Kehadiran Pengunjung (Attendance)
              </h3>
              <p className="text-[11px] text-muted">
                Statistik pemindaian tiket pada pintu masuk (check-in).
              </p>
            </div>
            <div className="font-display text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.attendance.attendanceRate}%
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-[11px] text-muted">Total Tiket</span>
              <div className="mt-0.5 font-bold text-ink">
                {data.attendance.totalSoldTickets}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Sudah Hadir
              </span>
              <div className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                {data.attendance.checkedInCount}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3">
              <span className="text-[11px] text-muted">Belum Hadir</span>
              <div className="mt-0.5 font-bold text-muted">
                {data.attendance.unattendedCount}
              </div>
            </div>
          </div>

          {/* Distribusi Check-in per Jam */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-muted">
              Aktivitas Check-in per Jam (WIB)
            </div>
            <div className="flex h-16 items-end gap-1 bg-page rounded-xl p-2">
              {data.attendance.hourlyCheckIns.map((h) => {
                const height =
                  maxCheckInCount > 0
                    ? Math.max(8, Math.round((h.count / maxCheckInCount) * 100))
                    : 8;
                return (
                  <div
                    key={h.hour}
                    title={`${h.hourLabel} WIB: ${h.count} check-in`}
                    className="flex-1 flex flex-col justify-end items-center h-full"
                  >
                    <div
                      style={{ height: `${height}%` }}
                      className={`w-full rounded-xs transition ${
                        h.count > 0 ? "bg-emerald-500" : "bg-line/40"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
