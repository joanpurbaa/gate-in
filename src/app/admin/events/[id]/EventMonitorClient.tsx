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
}

export function EventMonitorClient({
  event,
  layout,
  zones,
  initialStats,
  initialSeats,
  participants,
  orders,
}: EventMonitorClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [seats, setSeats] = useState<SeatMapItem[]>(initialSeats);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState<"peserta" | "transaksi">("peserta");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const pollLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/live`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.seats)) setSeats(data.seats);
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header Acara */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                event.status === "PUBLISHED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-stone-300 bg-stone-100 text-stone-700"
              }`}
            >
              {event.status}
            </span>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">{event.name}</h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#3730A3]" />
              {formatDateTime(event.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#3730A3]" />
              {event.venueName}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {event.status === "PUBLISHED" && (
            <>
              <Link
                href={`/admin/events/${event.id}/checkin`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-green-800"
              >
                <QrCode className="h-4 w-4" />
                <span>Buka Scanner Check-in</span>
              </Link>
              <Link
                href={`/e/${event.slug}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                <span>Halaman Publik</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Ubah Acara</span>
          </Link>
        </div>
      </div>

      {/* Kartu Statistik */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <section className="mb-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Pemantauan Denah Kursi & Kehadiran Live
            </h2>
            <p className="text-xs text-stone-600">
              Kursi berwarna <strong>hijau dengan centang</strong> menandakan pemilik tiket sudah
              hadir dan melakukan check-in.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <RefreshCw className="h-3.5 w-3.5 text-[#3730A3]" />
            <span>Auto-refresh 3 dtk ({lastUpdated.toLocaleTimeString("id-ID")})</span>
          </div>
        </div>

        {layout ? (
          <SeatMap layout={layout} seats={seats} zones={zones} mode="view" />
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-xs text-stone-600">
            Acara ini belum memiliki denah kursi.{" "}
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="font-bold text-[#3730A3] underline"
            >
              Susun layout di wizard
            </Link>
            .
          </div>
        )}
      </section>

      {/* Tabel Peserta & Transaksi + Unduh CSV */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("peserta");
                setStatusFilter("ALL");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                activeTab === "peserta"
                  ? "bg-[#3730A3] text-white"
                  : "border border-stone-200 bg-stone-50 text-stone-700"
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
                  ? "bg-[#3730A3] text-white"
                  : "border border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              Daftar Transaksi ({orders.length})
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/events/${event.id}/export?type=peserta`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5 text-[#3730A3]" />
              <span>Unduh CSV Peserta</span>
            </a>
            <a
              href={`/api/admin/events/${event.id}/export?type=transaksi`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5 text-[#3730A3]" />
              <span>Unduh CSV Transaksi</span>
            </a>
          </div>
        </div>

        {/* Filter & Pencarian */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, nomor WA, kursi (mis. C-8), atau kode tiket..."
              className="min-h-9 w-full rounded-xl border border-stone-300 py-1.5 pr-3 pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-9 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
          >
            <option value="ALL">Semua Status</option>
            {activeTab === "peserta" ? (
              <>
                <option value="USED">Sudah Check-in (Hadir)</option>
                <option value="VALID">Belum Check-in (Valid)</option>
              </>
            ) : (
              <>
                <option value="PAID">Lunas (PAID)</option>
                <option value="PENDING">Ditahan (PENDING)</option>
                <option value="FAILED">Gagal (FAILED)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
              </>
            )}
          </select>
        </div>

        {/* Tabel Peserta */}
        {activeTab === "peserta" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                  <th className="px-3 py-2.5 font-semibold">Kode Tiket</th>
                  <th className="px-3 py-2.5 font-semibold">Kursi & Zona</th>
                  <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                  <th className="px-3 py-2.5 font-semibold">WhatsApp</th>
                  <th className="px-3 py-2.5 font-semibold">Status Kehadiran</th>
                  <th className="px-3 py-2.5 font-semibold">Waktu Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-stone-500">
                      Tidak ada data peserta yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => (
                    <tr key={p.code} className="hover:bg-stone-50/70">
                      <td className="px-3 py-2.5 font-mono font-bold text-stone-900">
                        <Link
                          href={`/tiket/${p.code}`}
                          className="text-[#3730A3] hover:underline"
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-stone-900">{p.seatLabel}</span>
                        <span className="ml-1.5 text-stone-500">({p.zoneName})</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-stone-900">{p.buyerName}</td>
                      <td className="px-3 py-2.5 font-mono text-stone-600">{p.buyerPhone}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            p.status === "USED"
                              ? "border-green-200 bg-green-100 text-green-800"
                              : "border-stone-200 bg-stone-100 text-stone-700"
                          }`}
                        >
                          {p.status === "USED" ? "HADIR" : "BELUM CHECK-IN"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-stone-600">
                        {p.checkedInAt ? formatShortDateTime(p.checkedInAt) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                  <th className="px-3 py-2.5 font-semibold">ID Pesanan</th>
                  <th className="px-3 py-2.5 font-semibold">Pemesan</th>
                  <th className="px-3 py-2.5 font-semibold">Kursi</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">WA</th>
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-stone-500">
                      Tidak ada transaksi yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-stone-50/70">
                      <td className="px-3 py-2.5 font-mono font-semibold text-stone-900">
                        <Link
                          href={`/pesanan/${o.id}`}
                          className="text-[#3730A3] hover:underline"
                        >
                          {o.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-stone-900">{o.buyerName}</div>
                        <div className="font-mono text-[11px] text-stone-500">{o.buyerPhone}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-stone-800">
                        {o.seatLabels.join(", ") || "-"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-stone-900">
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
                      <td className="px-3 py-2.5 font-mono text-[11px] text-stone-600">
                        {o.waStatus ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-stone-600">
                        {formatShortDateTime(o.paidAt ?? o.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
