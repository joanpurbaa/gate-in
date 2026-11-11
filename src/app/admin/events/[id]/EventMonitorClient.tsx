"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit3,
  ExternalLink,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
} from "lucide-react";
import { SeatMap } from "@/components/seatmap/SeatMap";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import { StatCard } from "@/components/ui/StatCard";
import type { LayoutV1 } from "@/lib/layout/types";
import { formatRupiah } from "@/lib/money";
import { formatDateTime, formatShortDateTime } from "@/lib/time";

export interface WaitingListDashboardData {
  stats: {
    totalEntries: number;
    totalWaiting: number;
    totalOffered: number;
    totalConverted: number;
    totalExpired: number;
    totalCancelled: number;
  };
  zones: {
    zoneId: string;
    zoneName: string;
    zoneColor: string;
    zonePrice: number;
    availableSeats: number;
    activeOfferedSeats: number;
    waitingCount: number;
    waitingRequestedSeats: number;
  }[];
  entries: {
    id: string;
    queueNumber: number;
    buyerName: string;
    buyerPhone: string;
    zoneId: string;
    zoneName: string;
    zoneColor: string;
    quantity: number;
    status: "WAITING" | "OFFERED" | "CONVERTED" | "EXPIRED" | "CANCELLED";
    token: string;
    offerExpiresAt: string | null;
    offerNotifiedAt: string | null;
    convertedOrderId: string | null;
    createdAt: string;
  }[];
}

interface ParticipantRow {
  code: string;
  seatLabel: string;
  zoneName: string;
  price: number;
  buyerName: string;
  buyerPhone: string;
  status: "VALID" | "USED";
  checkedInAt: string | null;
}

interface OrderRow {
  id: string;
  buyerName: string;
  buyerPhone: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  totalAmount: number;
  waStatus: "SENT" | "FAILED" | "SKIPPED" | null;
  seatLabels: string[];
  ticketCodes: string[];
  createdAt: string;
  paidAt: string | null;
}

interface EventMonitorClientProps {
  event: {
    id: string;
    slug: string;
    name: string;
    venueName: string;
    startsAt: string;
    gateOpenAt: string;
    gateCloseAt: string;
    status: "DRAFT" | "PUBLISHED";
  };
  layout: LayoutV1 | null;
  zones: SeatZoneInfo[];
  initialStats: {
    totalSeats: number;
    soldSeats: number;
    heldSeats: number;
    availableSeats: number;
    checkedInSeats: number;
    revenue: number;
  };
  initialSeats: SeatMapItem[];
  participants: ParticipantRow[];
  orders: OrderRow[];
  initialWaitingList?: WaitingListDashboardData;
}

export function EventMonitorClient({
  event,
  layout,
  zones,
  initialStats,
  initialSeats,
  participants,
  orders,
  initialWaitingList,
}: EventMonitorClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [seats, setSeats] = useState<SeatMapItem[]>(initialSeats);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState<"peserta" | "transaksi" | "waiting-list">("peserta");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [waitingList, setWaitingList] = useState<WaitingListDashboardData>(
    initialWaitingList ?? {
      stats: {
        totalEntries: 0,
        totalWaiting: 0,
        totalOffered: 0,
        totalConverted: 0,
        totalExpired: 0,
        totalCancelled: 0,
      },
      zones: [],
      entries: [],
    }
  );

  const pollLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/live`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.seats)) setSeats(data.seats);
      }

      const wlRes = await fetch(`/api/admin/events/${event.id}/waiting-list`, { cache: "no-store" });
      if (wlRes.ok) {
        const wlData = await wlRes.json();
        if (wlData.stats) {
          setWaitingList({
            stats: wlData.stats,
            zones: wlData.zones ?? [],
            entries: wlData.entries ?? [],
          });
        }
      }

      setLastUpdated(new Date());
    } catch {
      // Abaikan gangguan sesaat
    }
  }, [event.id]);

  useEffect(() => {
    const id = window.setInterval(pollLive, 3000);
    return () => window.clearInterval(id);
  }, [pollLive]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        p.seatLabel.toLowerCase().includes(q) ||
        p.buyerName.toLowerCase().includes(q) ||
        p.buyerPhone.toLowerCase().includes(q)
      );
    });
  }, [participants, searchQuery, statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerPhone.toLowerCase().includes(q) ||
        o.seatLabels.some((l) => l.toLowerCase().includes(q))
      );
    });
  }, [orders, searchQuery, statusFilter]);

  const filteredWaitingEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (waitingList?.entries ?? []).filter((w) => {
      if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
      if (!q) return true;
      return (
        w.buyerName.toLowerCase().includes(q) ||
        w.buyerPhone.toLowerCase().includes(q) ||
        w.zoneName.toLowerCase().includes(q)
      );
    });
  }, [waitingList, searchQuery, statusFilter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header Acara */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                event.status === "PUBLISHED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-line bg-page text-ink"
              }`}
            >
              {event.status}
            </span>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">{event.name}</h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gate" />
              {formatDateTime(event.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gate" />
              {event.venueName}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {event.status === "PUBLISHED" && (
            <>
              <Link
                href={`/admin/events/${event.id}/checkin`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-seat-checked px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-seat-checked-edge whitespace-nowrap shrink-0"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span>Scan Check-in</span>
              </Link>
              <Link
                href={`/e/${event.slug}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink hover:bg-page whitespace-nowrap shrink-0"
              >
                <span>Halaman Publik</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
            </>
          )}
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink hover:bg-page whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span>Ubah Acara</span>
          </Link>
        </div>
      </div>

      {/* Kartu Statistik */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Tiket Terjual"
          value={`${stats.soldSeats} / ${stats.totalSeats}`}
          sublabel={`${stats.heldSeats} kursi sedang ditahan`}
          tone="indigo"
        />
        <StatCard
          label="Peserta Hadir (Check-in)"
          value={`${stats.checkedInSeats} / ${stats.soldSeats}`}
          sublabel="Ditampilkan hijau di denah"
          tone="green"
        />
        <StatCard
          label="Sisa Kursi Tersedia"
          value={stats.availableSeats}
          sublabel="Dapat dipilih pengunjung"
        />
        <StatCard
          label="Total Pendapatan"
          value={formatRupiah(stats.revenue)}
          sublabel="Transaksi berstatus PAID"
        />
      </div>

      {/* Denah Live */}
      <section className="mb-7 rounded-2xl border border-line bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">
              Pemantauan Denah Kursi & Kehadiran Live
            </h2>
            <p className="text-xs text-muted">
              Kursi berwarna <strong>hijau dengan centang</strong> menandakan pemilik tiket sudah
              hadir dan melakukan check-in.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <RefreshCw className="h-3.5 w-3.5 text-gate" />
            <span>Auto-refresh 3 dtk ({lastUpdated.toLocaleTimeString("id-ID")})</span>
          </div>
        </div>

        {layout ? (
          <SeatMap layout={layout} seats={seats} zones={zones} mode="view" />
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-page p-8 text-center text-xs text-muted">
            Acara ini belum memiliki denah kursi.{" "}
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="font-bold text-gate underline"
            >
              Susun layout di wizard
            </Link>
            .
          </div>
        )}
      </section>

      {/* Tabel Peserta & Transaksi + Unduh CSV */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("peserta");
                setStatusFilter("ALL");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                activeTab === "peserta"
                  ? "bg-gate text-white"
                  : "border border-line bg-page text-ink"
              }`}
            >
              Daftar Peserta & Tiket ({participants.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("transaksi");
                setStatusFilter("ALL");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                activeTab === "transaksi"
                  ? "bg-gate text-white"
                  : "border border-line bg-page text-ink"
              }`}
            >
              Daftar Transaksi ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("waiting-list");
                setStatusFilter("ALL");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                activeTab === "waiting-list"
                  ? "bg-gate text-white"
                  : "border border-line bg-page text-ink"
              }`}
            >
              Smart Waiting List ({waitingList.entries.length})
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/events/${event.id}/export?type=peserta`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-page"
            >
              <Download className="h-3.5 w-3.5 text-gate" />
              <span>Unduh CSV Peserta</span>
            </a>
            <a
              href={`/api/admin/events/${event.id}/export?type=transaksi`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-page"
            >
              <Download className="h-3.5 w-3.5 text-gate" />
              <span>Unduh CSV Transaksi</span>
            </a>
          </div>
        </div>

        {/* Filter & Pencarian */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, nomor WA, kursi (mis. C-8), atau kode tiket..."
              className="min-h-9 w-full rounded-xl border border-line py-1.5 pr-3 pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-9 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink"
          >
            <option value="ALL">Semua Status</option>
            {activeTab === "peserta" ? (
              <>
                <option value="USED">Sudah Check-in (Hadir)</option>
                <option value="VALID">Belum Check-in (Valid)</option>
              </>
            ) : activeTab === "transaksi" ? (
              <>
                <option value="PAID">Lunas (PAID)</option>
                <option value="PENDING">Ditahan (PENDING)</option>
                <option value="FAILED">Gagal (FAILED)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
              </>
            ) : (
              <>
                <option value="WAITING">Menunggu (WAITING)</option>
                <option value="OFFERED">Ditawarkan (OFFERED)</option>
                <option value="CONVERTED">Dikonversi (CONVERTED)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
              </>
            )}
          </select>
        </div>

        {/* Tabel Peserta */}
        {activeTab === "peserta" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-page text-muted">
                  <th className="px-3 py-2.5 font-semibold">Kode Tiket</th>
                  <th className="px-3 py-2.5 font-semibold">Kursi & Zona</th>
                  <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                  <th className="px-3 py-2.5 font-semibold">WhatsApp</th>
                  <th className="px-3 py-2.5 font-semibold">Status Kehadiran</th>
                  <th className="px-3 py-2.5 font-semibold">Waktu Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted">
                      Tidak ada data peserta yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => (
                    <tr key={p.code} className="hover:bg-page">
                      <td className="px-3 py-2.5 font-mono font-bold text-ink">
                        <Link
                          href={`/tiket/${p.code}`}
                          className="text-gate hover:underline"
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-ink">{p.seatLabel}</span>
                        <span className="ml-1.5 text-muted">({p.zoneName})</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-ink">{p.buyerName}</td>
                      <td className="px-3 py-2.5 font-mono text-muted">{p.buyerPhone}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            p.status === "USED"
                              ? "border-green-200 bg-green-100 text-green-800"
                              : "border-line bg-page text-ink"
                          }`}
                        >
                          {p.status === "USED" ? "HADIR" : "BELUM CHECK-IN"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {p.checkedInAt ? formatShortDateTime(p.checkedInAt) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "transaksi" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-page text-muted">
                  <th className="px-3 py-2.5 font-semibold">ID Pesanan</th>
                  <th className="px-3 py-2.5 font-semibold">Pemesan</th>
                  <th className="px-3 py-2.5 font-semibold">Kursi</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">WA</th>
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      Tidak ada transaksi yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-page">
                      <td className="px-3 py-2.5 font-mono font-semibold text-ink">
                        <Link
                          href={`/pesanan/${o.id}`}
                          className="text-gate hover:underline"
                        >
                          {o.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-ink">{o.buyerName}</div>
                        <div className="font-mono text-[11px] text-muted">{o.buyerPhone}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-ink">
                        {o.seatLabels.join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-ink">
                        {formatRupiah(o.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            o.status === "PAID"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : o.status === "PENDING"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted">
                        {o.waStatus ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {formatShortDateTime(o.paidAt ?? o.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab Smart Waiting List */
          <div className="mt-4 space-y-6">
            {/* 4 Kartu Statistik Waiting List */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-page p-3.5">
                <div className="text-[11px] font-semibold text-muted">Menunggu (FIFO)</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {waitingList.stats.totalWaiting}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-page p-3.5">
                <div className="text-[11px] font-semibold text-muted">Penawaran Aktif</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {waitingList.stats.totalOffered}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-page p-3.5">
                <div className="text-[11px] font-semibold text-muted">Dikonversi (Dipesan)</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-gate">
                  {waitingList.stats.totalConverted}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-page p-3.5">
                <div className="text-[11px] font-semibold text-muted">Kedaluwarsa / Batal</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-muted">
                  {waitingList.stats.totalExpired + waitingList.stats.totalCancelled}
                </div>
              </div>
            </div>

            {/* Ringkasan Antrean per Zona */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Ringkasan Antrean per Zona
              </h4>
              <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[580px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-page text-muted">
                      <th className="px-3 py-2 font-semibold">Kategori Zona</th>
                      <th className="px-3 py-2 font-semibold">Harga</th>
                      <th className="px-3 py-2 font-semibold">Kursi Tersedia</th>
                      <th className="px-3 py-2 font-semibold">Sedang Ditawarkan</th>
                      <th className="px-3 py-2 font-semibold">Pendaftar Menunggu</th>
                      <th className="px-3 py-2 font-semibold">Total Tiket Diminta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {waitingList.zones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-muted">
                          Belum ada data zona tiket.
                        </td>
                      </tr>
                    ) : (
                      waitingList.zones.map((z) => (
                        <tr key={z.zoneId} className="hover:bg-page">
                          <td className="px-3 py-2 font-bold text-ink">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: z.zoneColor }}
                              />
                              {z.zoneName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted">{formatRupiah(z.zonePrice)}</td>
                          <td className="px-3 py-2 font-semibold text-ink">{z.availableSeats}</td>
                          <td className="px-3 py-2 text-muted">{z.activeOfferedSeats}</td>
                          <td className="px-3 py-2 font-bold text-amber-600 dark:text-amber-400">
                            {z.waitingCount} orang
                          </td>
                          <td className="px-3 py-2 font-bold text-gate">
                            {z.waitingRequestedSeats} tiket
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel Antrean Kandidat FIFO */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Daftar Kandidat Waiting List ({filteredWaitingEntries.length})
              </h4>
              <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-page text-muted">
                      <th className="px-3 py-2.5 font-semibold">No (FIFO)</th>
                      <th className="px-3 py-2.5 font-semibold">Calon Pembeli</th>
                      <th className="px-3 py-2.5 font-semibold">Zona & Kuota</th>
                      <th className="px-3 py-2.5 font-semibold">Status Antrean</th>
                      <th className="px-3 py-2.5 font-semibold">Waktu Daftar</th>
                      <th className="px-3 py-2.5 font-semibold">Status Penawaran</th>
                      <th className="px-3 py-2.5 font-semibold">Tautan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredWaitingEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted">
                          Tidak ada kandidat waiting list yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredWaitingEntries.map((w, idx) => (
                        <tr key={w.id} className="hover:bg-page">
                          <td className="px-3 py-2.5 font-mono font-bold text-gate">
                            #{w.queueNumber ?? idx + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-ink">{w.buyerName}</div>
                            <div className="font-mono text-[11px] text-muted">{w.buyerPhone}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: w.zoneColor }}
                              />
                              {w.zoneName}
                            </span>
                            <div className="font-bold text-gate">{w.quantity} tiket</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                w.status === "WAITING"
                                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                                  : w.status === "OFFERED"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    : w.status === "CONVERTED"
                                      ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                                      : "border-line bg-page text-muted"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted">
                            {formatShortDateTime(w.createdAt)}
                          </td>
                          <td className="px-3 py-2.5 text-[11px]">
                            {w.status === "OFFERED" && w.offerExpiresAt ? (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                Berakhir {formatShortDateTime(w.offerExpiresAt)}
                              </span>
                            ) : w.status === "CONVERTED" && w.convertedOrderId ? (
                              <Link
                                href={`/pesanan/${w.convertedOrderId}`}
                                className="font-mono text-gate hover:underline"
                              >
                                {w.convertedOrderId}
                              </Link>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/waiting-list/${w.token}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gate hover:underline"
                              >
                                <span>Status</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              {w.status === "OFFERED" && (
                                <Link
                                  href={`/offer/${w.token}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                                >
                                  <span>Offer</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
