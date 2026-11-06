"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import type { WaitingListEntryDetails } from "@/lib/waiting-list/types";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

interface WaitingListStatusClientProps {
  initialEntry: WaitingListEntryDetails;
}

export function WaitingListStatusClient({
  initialEntry,
}: WaitingListStatusClientProps) {
  const [entry, setEntry] = useState<WaitingListEntryDetails>(initialEntry);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/waiting-list/${entry.token}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Gagal membatalkan antrean.");
        return;
      }
      setEntry((prev) => ({ ...prev, status: "CANCELLED" }));
      setShowConfirmCancel(false);
    } catch {
      setCancelError("Terjadi gangguan jaringan saat membatalkan antrean.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Kartu Status Utama */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-xs">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-muted">Status Pendaftaran</span>
              <div className="mt-0.5 flex items-center gap-2">
                {entry.status === "WAITING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    Dalam Antrean (FIFO)
                  </span>
                )}
                {entry.status === "OFFERED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-pulse">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tiket Tersedia Untuk Anda!
                  </span>
                )}
                {entry.status === "CONVERTED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tiket Berhasil Dipesan
                  </span>
                )}
                {entry.status === "EXPIRED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-line px-3 py-1 text-xs font-bold text-muted">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Penawaran Kedaluwarsa
                  </span>
                )}
                {entry.status === "CANCELLED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Dibatalkan
                  </span>
                )}
              </div>
            </div>

            {/* Nomor Antrean (jika status WAITING) */}
            {entry.status === "WAITING" && typeof entry.queuePosition === "number" && (
              <div className="text-right">
                <span className="text-[11px] font-semibold text-muted">Posisi Anda</span>
                <div className="font-display text-2xl font-extrabold text-gate">
                  #{entry.queuePosition}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Banner Tindakan Berdasarkan Status */}
          {entry.status === "OFFERED" && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-4 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <h4 className="font-display text-sm font-bold">
                    Kabar Baik! Tiket Anda Telah Tersedia
                  </h4>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                    Kursi pada zona <strong>{entry.zoneName}</strong> telah siap untuk Anda
                    pesan. Ambil alokasi tiket Anda sebelum batas waktu penawaran berakhir.
                  </p>
                  <div className="mt-3">
                    <Link
                      href={`/offer/${entry.token}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Buka Halaman Penawaran & Pesan
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {entry.status === "WAITING" && (
            <div className="rounded-xl border border-gate/20 bg-gate/5 p-4 text-xs text-ink">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-gate" />
                <div>
                  <h4 className="font-bold text-gate">Menunggu Giliran Sesuai Antrean FIFO</h4>
                  <p className="mt-1 leading-relaxed text-muted">
                    Sistem GateIn mengalokasikan kursi otomatis saat ada tiket yang batal
                    atau pesanan yang tidak diselesaikan pengunjung lain. Tautan penawaran
                    akan dikirimkan langsung ke nomor WhatsApp{" "}
                    <strong className="text-ink">{entry.buyerPhone}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {entry.status === "CONVERTED" && entry.convertedOrderId && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-4 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-300">
                    Penawaran Berhasil Dikonversi
                  </h4>
                  <p className="mt-1 text-muted">
                    ID Pesanan:{" "}
                    <span className="font-mono font-semibold text-ink">
                      {entry.convertedOrderId}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/pesanan/${entry.convertedOrderId}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gate px-3.5 text-xs font-semibold text-white transition hover:bg-gate-strong"
                >
                  <span>Buka Pesanan</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Rincian Permintaan Tiket */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-page p-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-semibold text-muted">Nama Pemesan</span>
              <div className="text-sm font-bold text-ink">{entry.buyerName}</div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted">Nomor WhatsApp</span>
              <div className="text-sm font-bold text-ink">{entry.buyerPhone}</div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted">Zona Kursi Dipilih</span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.zoneColor }}
                />
                <span className="text-sm font-bold text-ink">{entry.zoneName}</span>
                <span className="text-xs text-muted">
                  ({formatRupiah(entry.zonePrice)}/kursi)
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted">Jumlah Tiket</span>
              <div className="text-sm font-bold text-gate">{entry.quantity} Tiket</div>
            </div>
          </div>

          {/* Rincian Acara */}
          <div className="rounded-xl border border-line bg-card p-4 space-y-2 text-xs">
            <h5 className="font-semibold text-ink">Informasi Acara</h5>
            <div className="flex items-center gap-2 text-muted">
              <Calendar className="h-3.5 w-3.5 text-gate" />
              <span>{formatDateTime(new Date(entry.startsAt))}</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="h-3.5 w-3.5 text-gate" />
              <span>{entry.venueName}</span>
            </div>
          </div>

          {/* Batalkan Antrean */}
          {entry.status === "WAITING" && (
            <div className="border-t border-line pt-4">
              {showConfirmCancel ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 p-4 text-xs dark:bg-rose-950/20">
                  <p className="font-semibold text-rose-800 dark:text-rose-300">
                    Apakah Anda yakin ingin keluar dari antrean waiting list?
                  </p>
                  <p className="mt-1 text-muted">
                    Posisi antrean Anda akan dilepaskan dan tidak dapat dikembalikan.
                  </p>
                  {cancelError && (
                    <div className="mt-2 text-rose-700 dark:text-rose-400">
                      {cancelError}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancel}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {isCancelling ? "Membatalkan..." : "Ya, Batalkan Antrean"}
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => setShowConfirmCancel(false)}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-line bg-card px-4 text-xs font-semibold text-ink hover:bg-page"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Batalkan pendaftaran antrean</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
