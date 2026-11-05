"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { CountdownBar } from "@/components/seatmap/CountdownBar";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

interface SimulatePaymentClientProps {
  order: {
    id: string;
    buyerName: string;
    buyerPhone: string;
    totalAmount: number;
    holdExpiresAt: string;
    event: {
      slug: string;
      name: string;
      venueName: string;
      startsAt: string;
    };
    seats: {
      label: string;
      zoneName: string;
      zoneColor: string;
      price: number;
    }[];
  };
}

export function SimulatePaymentClient({ order }: SimulatePaymentClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"SUCCESS" | "FAILED" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const handleSimulate = async (outcome: "SUCCESS" | "FAILED") => {
    if (submitting) return;
    setSubmitting(outcome);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal memproses pembayaran.");
        setSubmitting(null);
        return;
      }

      if (outcome === "SUCCESS") {
        router.push(`/pesanan/${order.id}`);
        router.refresh();
      } else {
        router.push(`/pesanan/${order.id}`);
        router.refresh();
      }
    } catch {
      setErrorMessage("Gagal menghubungi server. Coba lagi.");
      setSubmitting(null);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <div className="space-y-4">
        <CountdownBar
          expiresAt={order.holdExpiresAt}
          onExpire={() => setIsExpired(true)}
        />

        {/* Pita informasi simulasi */}
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/90 p-3.5 text-xs text-indigo-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3730A3]" />
          <div>
            <strong className="font-bold">Mode Pembayaran Simulasi (Sandbox Prototype)</strong>
            <p className="mt-0.5 text-indigo-900/80">
              Tidak memerlukan data kartu atau rekening asli. Gunakan tombol di bawah untuk menguji
              skenario pembayaran berhasil maupun gagal/batal.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-stone-900">Konfirmasi Pembayaran</h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-900">
              PENDING
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-stone-200 bg-[#FAFAF7] p-3.5">
            <div className="text-sm font-bold text-stone-900">{order.event.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#3730A3]" />
                {formatDateTime(order.event.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#3730A3]" />
                {order.event.venueName}
              </span>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-stone-500">ID Pesanan</dt>
              <dd className="font-mono font-semibold text-stone-800">{order.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Pemesan</dt>
              <dd className="font-semibold text-stone-900">{order.buyerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">WhatsApp Penerima Tiket</dt>
              <dd className="font-mono font-semibold text-stone-900">{order.buyerPhone}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-stone-200 pt-3.5">
            <div className="text-xs font-semibold text-stone-700">
              Rincian Kursi ({order.seats.length})
            </div>
            <ul className="mt-2 space-y-2">
              {order.seats.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: s.zoneColor }}
                    />
                    <span className="font-mono font-bold text-stone-900">Kursi {s.label}</span>
                    <span className="text-stone-600">• {s.zoneName}</span>
                  </div>
                  <span className="font-semibold text-stone-900">{formatRupiah(s.price)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3.5 flex items-center justify-between border-t border-stone-200 pt-3.5 text-base font-bold text-stone-900">
              <span>Total Tagihan</span>
              <span className="text-[#3730A3]">{formatRupiah(order.totalAmount)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p>{errorMessage}</p>
                <Link
                  href={`/e/${order.event.slug}/beli`}
                  className="mt-1.5 inline-block font-bold underline"
                >
                  Kembali Pilih Kursi di Denah
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={submitting !== null || isExpired}
              onClick={() => handleSimulate("SUCCESS")}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {submitting === "SUCCESS"
                  ? "Mengonfirmasi Tiket & Mengirim WhatsApp..."
                  : "Simulasikan Pembayaran Berhasil"}
              </span>
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleSimulate("FAILED")}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50/70 px-5 py-3 text-xs font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>
                {submitting === "FAILED"
                  ? "Melepas Kursi..."
                  : "Simulasikan Pembayaran Gagal (Lepas Kursi)"}
              </span>
            </button>

            {isExpired && (
              <Link
                href={`/e/${order.event.slug}/beli`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Denah Acara</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
