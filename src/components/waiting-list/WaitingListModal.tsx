"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Copy, Check, Users, X, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/money";

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    slug: string;
    name: string;
    maxSeatsPerOrder: number;
  };
  zones: {
    id: string;
    name: string;
    color: string;
    price: number;
    available: number;
  }[];
  initialZoneId?: string;
}

export function WaitingListModal({
  isOpen,
  onClose,
  event,
  zones,
  initialZoneId,
}: WaitingListModalProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState(
    initialZoneId || zones[0]?.id || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registeredResult, setRegisteredResult] = useState<{
    token: string;
    queuePosition: number;
    zoneName: string;
    quantity: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = buyerName.trim();
    if (trimmedName.length < 2) {
      setError("Nama lengkap pemesan minimal 2 karakter.");
      return;
    }

    if (!buyerPhone.trim()) {
      setError("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (!selectedZoneId) {
      setError("Pilih zona tiket yang Anda inginkan.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          zoneId: selectedZoneId,
          buyerName: trimmedName,
          buyerPhone: buyerPhone.trim(),
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar ke antrean waiting list.");
        return;
      }

      const zoneObj = zones.find((z) => z.id === selectedZoneId);
      setRegisteredResult({
        token: data.entry.token,
        queuePosition: data.queuePosition,
        zoneName: zoneObj?.name || "Zona Terpilih",
        quantity,
      });
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!registeredResult) return;
    const url = `${window.location.origin}/waiting-list/${registeredResult.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleResetAndClose = () => {
    setRegisteredResult(null);
    setError(null);
    setBuyerName("");
    setBuyerPhone("");
    setQuantity(1);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gate/10 text-gate">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Smart Waiting List
              </h2>
              <p className="text-xs text-muted">Acara: {event.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-lg p-1 text-muted hover:bg-page hover:text-ink transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi Modal: Form vs Hasil */}
        <div className="p-5">
          {registeredResult ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  Berhasil Masuk Antrean!
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Permintaan {registeredResult.quantity} tiket di{" "}
                  <strong>{registeredResult.zoneName}</strong> telah terdaftar.
                </p>
              </div>

              {/* Posisi Antrean */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Posisi Antrean Saat Ini
                </span>
                <div className="font-display text-3xl font-extrabold text-emerald-600 dark:text-emerald-300">
                  #{registeredResult.queuePosition}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Sistem bekerja secara FIFO (First In, First Out). Begitu kursi
                  kembali tersedia, Anda akan menerima notifikasi otomatis via WhatsApp.
                </p>
              </div>

              {/* Tautan Tracking */}
              <div className="rounded-xl border border-line bg-page p-3 text-left">
                <div className="text-[11px] font-semibold text-muted">
                  Tautan Pemantauan Status Anda:
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/waiting-list/${registeredResult.token}`
                        : `/waiting-list/${registeredResult.token}`
                    }
                    className="min-h-9 flex-1 rounded-lg border border-line bg-card px-2.5 text-xs text-muted"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-gate px-3 text-xs font-semibold text-white transition hover:bg-gate-strong"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Link
                  href={`/waiting-list/${registeredResult.token}`}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-gate px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gate-strong"
                >
                  Buka Halaman Status Antrean
                </Link>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-card px-4 text-xs font-semibold text-ink transition hover:bg-page"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="rounded-xl border border-gate/20 bg-gate/5 p-3 text-xs text-ink">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
                  <div>
                    <span className="font-semibold text-gate">Pemberitahuan Otomatis:</span>{" "}
                    Jika ada pesanan kedaluwarsa atau tiket dibatalkan, GateIn akan
                    segera menawarkan alokasi tiket kepada antrean teratas melalui
                    WhatsApp.
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-50/70 p-3 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Input Nama */}
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Nama Lengkap Pemesan
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-page px-3 text-xs font-medium text-ink focus:border-gate focus:outline-none"
                />
              </div>

              {/* Input WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Nomor WhatsApp Aktif
                </label>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="Contoh: 082275338090"
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-page px-3 text-xs font-medium text-ink focus:border-gate focus:outline-none"
                />
                <span className="mt-1 block text-[11px] text-muted">
                  Tautan penawaran tiket akan otomatis dikirimkan ke nomor ini.
                </span>
              </div>

              {/* Pilihan Zona Tiket */}
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Pilih Zona Tiket yang Diinginkan
                </label>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition ${
                        selectedZoneId === zone.id
                          ? "border-gate bg-gate/5 ring-1 ring-gate"
                          : "border-line bg-card hover:bg-page"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <div>
                          <div className="text-xs font-bold text-ink">{zone.name}</div>
                          <div className="text-[11px] text-muted">
                            {formatRupiah(zone.price)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-muted">
                        {zone.available > 0 ? `${zone.available} sisa` : "Habis"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jumlah Tiket */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink">
                    Jumlah Kursi yang Dibutuhkan
                  </label>
                  <span className="text-xs font-bold text-gate">{quantity} Tiket</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {[...Array(Math.min(event.maxSeatsPerOrder, 5))].map((_, i) => {
                    const val = i + 1;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setQuantity(val)}
                        className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${
                          quantity === val
                            ? "border-gate bg-gate text-white"
                            : "border-line bg-page text-ink hover:bg-card"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[11px] text-muted">
                  Catatan: Kami hanya menawarkan alokasi jika tersedia minimal {quantity}{" "}
                  kursi secara utuh.
                </span>
              </div>

              {/* Tombol Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gate px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gate-strong disabled:opacity-60"
                >
                  {loading ? "Mendaftarkan ke antrean..." : "Masuk Antrean Waiting List"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
