"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import type { WaitingListEntryDetails } from "@/lib/waiting-list/types";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

interface OfferLandingClientProps {
  entry: WaitingListEntryDetails;
}

export function OfferLandingClient({ entry }: OfferLandingClientProps) {
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!entry.offerExpiresAt) return 0;
    const diff = Math.floor(
      (new Date(entry.offerExpiresAt).getTime() - Date.now()) / 1000
    );
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (remainingSec <= 0) return;
    const interval = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSec]);

  const isExpired =
    entry.status === "EXPIRED" ||
    (entry.status === "OFFERED" && remainingSec <= 0);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (entry.status === "CONVERTED") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold text-ink">
          Penawaran Telah Dikonversi
        </h2>
        <p className="mt-1 text-xs text-muted">
          Anda telah berhasil menggunakan kuota penawaran ini untuk memesan tiket.
        </p>
        {entry.convertedOrderId && (
          <div className="mt-5">
            <Link
              href={`/pesanan/${entry.convertedOrderId}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gate px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-gate-strong"
            >
              <span>Buka Detail Tiket & Pesanan</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold text-ink">
          Masa Penawaran Telah Berakhir
        </h2>
        <p className="mt-1 text-xs text-muted max-w-[42ch] mx-auto">
          Batas waktu penawaran 15 menit telah habis. Kuota kursi telah dialihkan
          secara otomatis ke antrean berikutnya.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href={`/e/${entry.eventSlug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gate px-5 text-xs font-semibold text-white transition hover:bg-gate-strong"
          >
            Daftar Waiting List Baru
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-page px-5 text-xs font-semibold text-ink transition hover:bg-card"
          >
            Lihat Acara Lainnya
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Kartu Penawaran Aktif */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
        {/* Banner Timer & Status */}
        <div className="border-b border-line bg-emerald-500/10 px-5 py-4 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Penawaran Tiket Eksklusif
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-card/80 px-3 py-1 border border-emerald-500/30">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatTimer(remainingSec)}
              </span>
              <span className="text-[10px] text-muted">tersisa</span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              Halo, {entry.buyerName}! Kursi Impianmu Tersedia.
            </h2>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Selamat! Giliran Anda telah tiba untuk memesan tiket acara{" "}
              <strong className="text-ink">{entry.eventName}</strong>. Segera pilih
              posisi kursi Anda pada denah sebelum penawaran berakhir.
            </p>
          </div>

          {/* Rincian Alokasi Penawaran */}
          <div className="rounded-xl border border-line bg-page p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-gate" />
                <span className="text-xs font-semibold text-muted">Kategori Zona</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.zoneColor }}
                />
                <span className="text-xs font-bold text-ink">{entry.zoneName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-semibold text-muted">Jumlah Kursi Tersedia</span>
              <span className="text-xs font-bold text-gate">{entry.quantity} Kursi</span>
            </div>

            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-semibold text-muted">Harga per Kursi</span>
              <span className="text-xs font-medium text-ink">
                {formatRupiah(entry.zonePrice)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-ink">Estimasi Total</span>
              <span className="font-display text-base font-extrabold text-gate">
                {formatRupiah(entry.zonePrice * entry.quantity)}
              </span>
            </div>
          </div>

          {/* Rincian Acara */}
          <div className="rounded-xl border border-line bg-card p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-muted">
              <Calendar className="h-3.5 w-3.5 text-gate" />
              <span>{formatDateTime(new Date(entry.startsAt))}</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="h-3.5 w-3.5 text-gate" />
              <span>{entry.venueName}</span>
            </div>
          </div>

          {/* Jaminan & Tombol CTA */}
          <div className="pt-2 space-y-3">
            <Link
              href={`/e/${entry.eventSlug}/beli?offer=${entry.token}`}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gate px-6 text-sm font-bold text-white shadow-md transition hover:bg-gate-strong"
            >
              Pilih Kursi & Lanjutkan Pemesanan
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-gate" />
              <span>
                Alokasi dilindungi secara eksklusif. Kursi dikunci secara atomik saat Anda
                menekan konfirmasi.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
