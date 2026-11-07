"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Filter,
  Loader2,
  Percent,
  Plus,
  Search,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import type { OrganizerPromoItem, OrganizerPromoStats } from "@/lib/promo/types";

interface EventWithZones {
  id: string;
  name: string;
  zones: {
    id: string;
    name: string;
  }[];
}

interface PromosClientProps {
  initialPromos: OrganizerPromoItem[];
  initialStats: OrganizerPromoStats;
  events: EventWithZones[];
}

export function PromosClient({
  initialPromos,
  initialStats,
  events,
}: PromosClientProps) {
  const router = useRouter();
  const [promos, setPromos] = useState<OrganizerPromoItem[]>(initialPromos);
  const [stats, setStats] = useState<OrganizerPromoStats>(initialStats);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<OrganizerPromoItem | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>("");
  const [formMinPurchase, setFormMinPurchase] = useState<string>("");
  const [formEventId, setFormEventId] = useState<string>("");
  const [formZoneId, setFormZoneId] = useState<string>("");
  const [formStartsAt, setFormStartsAt] = useState<string>("");
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");
  const [formTotalQuota, setFormTotalQuota] = useState<string>("");
  const [formMaxUsesPerUser, setFormMaxUsesPerUser] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Notification / toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Format datetime for <input type="datetime-local">
  const toDateTimeLocal = (isoString?: string) => {
    if (!isoString) {
      const d = new Date();
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const d = new Date(isoString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormDiscountType("PERCENTAGE");
    setFormDiscountValue(15);
    setFormMaxDiscount("");
    setFormMinPurchase("");
    setFormEventId("");
    setFormZoneId("");
    setFormStartsAt(toDateTimeLocal());
    // Default 1 bulan ke depan
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setFormExpiresAt(toDateTimeLocal(oneMonthLater.toISOString()));
    setFormTotalQuota("50");
    setFormMaxUsesPerUser(1);
    setFormIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: OrganizerPromoItem) => {
    setEditingPromo(p);
    setFormName(p.name);
    setFormCode(p.code);
    setFormDescription(p.description || "");
    setFormDiscountType(p.discountType);
    setFormDiscountValue(p.discountValue);
    setFormMaxDiscount(p.maxDiscountAmount ? String(p.maxDiscountAmount) : "");
    setFormMinPurchase(p.minPurchaseAmount ? String(p.minPurchaseAmount) : "");
    setFormEventId(p.eventId || "");
    setFormZoneId(p.zoneId || "");
    setFormStartsAt(toDateTimeLocal(p.startsAt));
    setFormExpiresAt(toDateTimeLocal(p.expiresAt));
    setFormTotalQuota(p.totalQuota !== null ? String(p.totalQuota) : "");
    setFormMaxUsesPerUser(p.maxUsesPerUser);
    setFormIsActive(p.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Zones available based on selected event in modal
  const selectedEventZones = useMemo(() => {
    if (!formEventId) return [];
    const ev = events.find((e) => e.id === formEventId);
    return ev ? ev.zones : [];
  }, [events, formEventId]);

  // Handle submit create or edit
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim() || undefined,
      discountType: formDiscountType,
      discountValue: Number(formDiscountValue),
      maxDiscountAmount: formMaxDiscount ? Number(formMaxDiscount) : null,
      minPurchaseAmount: formMinPurchase ? Number(formMinPurchase) : null,
      eventId: formEventId || null,
      zoneId: formEventId && formZoneId ? formZoneId : null,
      startsAt: new Date(formStartsAt).toISOString(),
      expiresAt: new Date(formExpiresAt).toISOString(),
      totalQuota: formTotalQuota ? Number(formTotalQuota) : null,
      maxUsesPerUser: Number(formMaxUsesPerUser) || 1,
      isActive: formIsActive,
    };

    try {
      const url = editingPromo
        ? `/api/admin/promos/${editingPromo.id}`
        : "/api/admin/promos";
      const method = editingPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Gagal menyimpan kode promo.");
        setModalSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      showToast(editingPromo ? "Kode promo berhasil diperbarui." : "Kode promo berhasil dibuat.");
      router.refresh();
      // Refresh local list
      const fetchUpdated = await fetch("/api/admin/promos");
      if (fetchUpdated.ok) {
        const fresh = await fetchUpdated.json();
        setPromos(fresh.promos);
        setStats(fresh.stats);
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/promos/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: data.isActive, statusText: data.isActive ? "ACTIVE" : "INACTIVE" } : p))
        );
        showToast(`Promo ${data.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
        router.refresh();
      }
    } catch {
      showToast("Gagal memperbarui status promo.");
    }
  };

  // Handle delete promo
  const handleDeletePromo = async (p: OrganizerPromoItem) => {
    const confirmText = p.usedQuota > 0
      ? `Promo "${p.code}" sudah memiliki ${p.usedQuota} penggunaan. Promo akan dinonaktifkan permanen demi menjaga integritas data riwayat. Lanjutkan?`
      : `Yakin ingin menghapus kode promo "${p.code}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/admin/promos/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menghapus promo.");
        return;
      }
      showToast(data.message || "Promo berhasil diproses.");
      router.refresh();
      const fetchUpdated = await fetch("/api/admin/promos");
      if (fetchUpdated.ok) {
        const fresh = await fetchUpdated.json();
        setPromos(fresh.promos);
        setStats(fresh.stats);
      }
    } catch {
      showToast("Gagal menghubungi server.");
    }
  };

  // Filter promos
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const matchQuery =
        !searchQuery ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchQuery) return false;

      if (statusFilter === "ACTIVE") return p.statusText === "ACTIVE";
      if (statusFilter === "INACTIVE") return p.statusText === "INACTIVE";
      if (statusFilter === "EXHAUSTED") return p.statusText === "EXHAUSTED";
      if (statusFilter === "EXPIRED") return p.statusText === "EXPIRED";
      return true;
    });
  }, [promos, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gate">
            <Tag className="h-3.5 w-3.5" />
            <span>Manajemen Diskon & Penjualan</span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
            Kode Promo & Diskon Tiket
          </h1>
          <p className="mt-1 text-xs text-muted">
            Kelola kode diskon, batasan kuota per pembeli, dan pantau penjualan yang dihasilkan.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-button bg-gate px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Promo Baru</span>
        </button>
      </div>

      {/* 4 Kartu KPI Statistik */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Promo</span>
            <Tag className="h-4 w-4 text-gate" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            {stats.totalPromos}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            <span className="font-semibold text-emerald-700">{stats.activePromos} aktif</span> •{" "}
            {stats.endedPromos} nonaktif/berakhir
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Penggunaan Promo</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            {stats.totalUsages}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Oleh <strong className="text-ink">{stats.uniqueBuyers}</strong> nomor WhatsApp unik
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Diskon Diberikan</span>
            <Percent className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            {formatRupiah(stats.totalDiscountGiven)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Akumulasi potongan ke pembeli
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Penjualan Berpromo</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-emerald-700">
            {formatRupiah(stats.totalSalesGenerated)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Total penerimaan dari transaksi berpromo
          </div>
        </div>
      </div>

      {/* Kontrol Pencarian & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari kode atau nama promo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-input border border-line bg-card py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted shrink-0">
            <Filter className="h-3 w-3" />
            <span>Status:</span>
          </span>
          {[
            { id: "ALL", label: "Semua" },
            { id: "ACTIVE", label: "Aktif" },
            { id: "EXHAUSTED", label: "Kuota Habis" },
            { id: "EXPIRED", label: "Berakhir" },
            { id: "INACTIVE", label: "Nonaktif" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
                statusFilter === tab.id
                  ? "bg-gate text-white"
                  : "bg-card border border-line text-muted hover:text-ink hover:bg-page"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Daftar Promo */}
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-xs">
        {filteredPromos.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="mx-auto h-10 w-10 text-muted/50" />
            <h3 className="mt-3 font-display text-sm font-bold text-ink">
              {searchQuery || statusFilter !== "ALL"
                ? "Tidak ada promo yang cocok dengan kriteria filter"
                : "Belum ada kode promo dibuat"}
            </h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "Coba ubah kata kunci pencarian atau ganti filter status di atas."
                : "Tingkatkan konversi tiket Anda dengan menawarkan diskon persentase atau potongan nominal kepada calon pembeli."}
            </p>
            {!searchQuery && statusFilter === "ALL" && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-button bg-gate px-4 py-2 text-xs font-semibold text-white hover:bg-gate-strong"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buat Promo Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-page text-[11px] font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Kode & Nama</th>
                  <th className="px-4 py-3">Bentuk Diskon</th>
                  <th className="px-4 py-3">Ruang Lingkup</th>
                  <th className="px-4 py-3">Kuota & Terpakai</th>
                  <th className="px-4 py-3">Batas & Min. Belanja</th>
                  <th className="px-4 py-3">Masa Berlaku</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPromos.map((p) => {
                  const quotaPercent =
                    p.totalQuota !== null && p.totalQuota > 0
                      ? Math.min(100, Math.round((p.usedQuota / p.totalQuota) * 100))
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-page/50 transition">
                      {/* Kode & Nama */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gate bg-gate/10 border border-gate/20 px-2 py-0.5 rounded-md text-xs">
                            {p.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(p.code)}
                            title="Salin kode"
                            className="text-muted hover:text-ink transition"
                          >
                            {copiedCode === p.code ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="font-semibold text-ink mt-0.5">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-muted line-clamp-1 mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Bentuk Diskon */}
                      <td className="px-4 py-3.5 font-medium">
                        {p.discountType === "PERCENTAGE" ? (
                          <div>
                            <span className="font-bold text-ink">
                              {p.discountValue}% OFF
                            </span>
                            {p.maxDiscountAmount && (
                              <div className="text-[11px] text-muted">
                                Maks. {formatRupiah(p.maxDiscountAmount)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-ink">
                              {formatRupiah(p.discountValue)}
                            </span>
                            <div className="text-[11px] text-muted">Potongan Tetap</div>
                          </div>
                        )}
                      </td>

                      {/* Ruang Lingkup */}
                      <td className="px-4 py-3.5">
                        {p.eventName ? (
                          <div>
                            <div className="font-semibold text-ink line-clamp-1">
                              {p.eventName}
                            </div>
                            <div className="text-[11px] text-muted">
                              {p.zoneName ? `Zona: ${p.zoneName}` : "Semua Zona"}
                            </div>
                          </div>
                        ) : (
                          <span className="rounded-full bg-page border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
                            Semua Acara
                          </span>
                        )}
                      </td>

                      {/* Kuota & Terpakai */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-ink">
                          <span>{p.usedQuota}</span>
                          <span className="text-muted font-normal">/</span>
                          <span>{p.totalQuota !== null ? p.totalQuota : "∞"}</span>
                        </div>
                        {quotaPercent !== null && (
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-line">
                            <div
                              className={`h-full ${
                                quotaPercent >= 100 ? "bg-rose-500" : "bg-gate"
                              }`}
                              style={{ width: `${quotaPercent}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Batas & Min. Belanja */}
                      <td className="px-4 py-3.5 text-[11px] text-muted space-y-0.5">
                        <div>
                          Maks:{" "}
                          <strong className="text-ink">
                            {p.maxUsesPerUser}x
                          </strong>{" "}
                          / WhatsApp
                        </div>
                        <div>
                          Min. Beli:{" "}
                          <strong className="text-ink">
                            {p.minPurchaseAmount
                              ? formatRupiah(p.minPurchaseAmount)
                              : "Tanpa min."}
                          </strong>
                        </div>
                      </td>

                      {/* Masa Berlaku */}
                      <td className="px-4 py-3.5 text-[11px] text-muted whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gate" />
                          <span>Mulai: {formatDateTime(p.startsAt)}</span>
                        </div>
                        <div className="mt-0.5 text-muted">
                          Sampai: {formatDateTime(p.expiresAt)}
                        </div>
                      </td>

                      {/* Status & Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.isActive)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                            p.statusText === "ACTIVE"
                              ? "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                              : p.statusText === "EXHAUSTED"
                              ? "bg-rose-50 border border-rose-200 text-rose-800"
                              : p.statusText === "EXPIRED"
                              ? "bg-amber-50 border border-amber-200 text-amber-800"
                              : "bg-line/60 border border-line text-muted hover:bg-line"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.statusText === "ACTIVE"
                                ? "bg-emerald-600"
                                : p.statusText === "EXHAUSTED"
                                ? "bg-rose-600"
                                : "bg-muted"
                            }`}
                          />
                          <span>
                            {p.statusText === "ACTIVE"
                              ? "Aktif"
                              : p.statusText === "EXHAUSTED"
                              ? "Kuota Habis"
                              : p.statusText === "EXPIRED"
                              ? "Berakhir"
                              : "Nonaktif"}
                          </span>
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="Edit Promo"
                            className="rounded-input p-1.5 text-muted hover:bg-line hover:text-ink transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(p)}
                            title="Hapus / Nonaktifkan Promo"
                            className="rounded-input p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Buat / Edit Promo */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => {
              if (!modalSubmitting) setIsModalOpen(false);
            }}
          />

          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-line bg-card shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  {editingPromo ? "Edit Kode Promo" : "Buat Kode Promo Baru"}
                </h2>
                <p className="text-xs text-muted">
                  Konfigurasikan diskon, batasan target, dan masa berlaku kupon.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={modalSubmitting}
                className="rounded-full p-1 text-muted hover:bg-page hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Scrollable */}
            <form onSubmit={handleSavePromo} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 rounded-input border border-rose-200 bg-rose-50 p-3 text-rose-900 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nama & Kode Promo */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Nama Promo <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Diskon Flash Sale"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Kode Promo <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: FLASHSALE20"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 font-mono uppercase text-ink focus:border-gate focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-ink mb-1">
                  Deskripsi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Keterangan singkat untuk catatan internal atau pembeli"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                />
              </div>

              {/* Tipe & Nilai Diskon */}
              <div className="rounded-input border border-line bg-page p-3.5 space-y-3">
                <div className="font-semibold text-ink">Bentuk & Besaran Potongan</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDiscountType("PERCENTAGE")}
                    className={`rounded-input border p-2.5 text-center font-semibold transition ${
                      formDiscountType === "PERCENTAGE"
                        ? "border-gate bg-card text-gate shadow-xs"
                        : "border-line bg-transparent text-muted hover:text-ink"
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDiscountType("FIXED_AMOUNT")}
                    className={`rounded-input border p-2.5 text-center font-semibold transition ${
                      formDiscountType === "FIXED_AMOUNT"
                        ? "border-gate bg-card text-gate shadow-xs"
                        : "border-line bg-transparent text-muted hover:text-ink"
                    }`}
                  >
                    Nominal Tetap (Rp)
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-ink mb-1">
                      {formDiscountType === "PERCENTAGE"
                        ? "Nilai Diskon (1 - 100 %)"
                        : "Potongan Harga (Rp)"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={formDiscountType === "PERCENTAGE" ? 100 : undefined}
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                      className="w-full rounded-input border border-line bg-card px-3 py-2 text-ink font-semibold focus:border-gate focus:outline-none"
                    />
                  </div>

                  {formDiscountType === "PERCENTAGE" && (
                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Diskon Maksimal (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="Contoh: 100000 (Opsional)"
                        value={formMaxDiscount}
                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                        className="w-full rounded-input border border-line bg-card px-3 py-2 text-ink focus:border-gate focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Lingkup Acara & Zona */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Berlaku untuk Acara
                  </label>
                  <select
                    value={formEventId}
                    onChange={(e) => {
                      setFormEventId(e.target.value);
                      setFormZoneId(""); // reset zona jika acara berganti
                    }}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  >
                    <option value="">Semua Acara Penyelenggara</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Berlaku untuk Zona
                  </label>
                  <select
                    disabled={!formEventId}
                    value={formZoneId}
                    onChange={(e) => setFormZoneId(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Semua Zona Kursi</option>
                    {selectedEventZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        Zona {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Periode Aktif */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Waktu Mulai <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Waktu Berakhir <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
              </div>

              {/* Batasan Kuota & Pemakaian */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Total Kuota
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Kosongkan jika bebas"
                    value={formTotalQuota}
                    onChange={(e) => setFormTotalQuota(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Batas per WhatsApp
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formMaxUsesPerUser}
                    onChange={(e) => setFormMaxUsesPerUser(Number(e.target.value))}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Min. Pembelian (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Opsional (Rp)"
                    value={formMinPurchase}
                    onChange={(e) => setFormMinPurchase(e.target.value)}
                    className="w-full rounded-input border border-line bg-page px-3 py-2 text-ink focus:border-gate focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-xs border-line text-gate focus:ring-gate"
                />
                <label htmlFor="promo-is-active" className="font-semibold text-ink cursor-pointer">
                  Aktifkan promo ini segera untuk pembeli
                </label>
              </div>

              {/* Footer Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                  className="rounded-button border border-line bg-card px-4 py-2 font-semibold text-ink hover:bg-page"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-button bg-gate px-5 py-2 font-semibold text-white hover:bg-gate-strong disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingPromo ? "Simpan Perubahan" : "Buat Kode Promo"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
