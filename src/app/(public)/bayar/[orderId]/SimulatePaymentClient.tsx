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
  Tag,
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
    originalAmount: number;
    discountAmount: number;
    promoCode: string | null;
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

      router.push(`/pesanan/${order.id}`);
      router.refresh();
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

        {/* Label mode simulasi yang netral */}
        <div className="flex items-start gap-2.5 rounded-input border border-line bg-card p-3.5 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gate" />
          <div>
            <strong className="font-semibold text-ink">Mode simulasi</strong>
            <p className="mt-0.5">
              Tidak memerlukan data kartu atau rekening asli. Gunakan tombol di bawah untuk
              mensimulasikan hasil pembayaran.
            </p>
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-lg font-bold text-ink">Konfirmasi pembayaran</h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Menunggu
            </span>
          </div>

          <div className="mt-3 rounded-input border border-line bg-page p-3.5">
            <div className="font-display text-sm font-bold text-ink">{order.event.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gate" />
                {formatDateTime(order.event.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gate" />
                {order.event.venueName}
              </span>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">ID pesanan</dt>
              <dd className="font-mono font-semibold text-ink">{order.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Pemesan</dt>
              <dd className="font-semibold text-ink">{order.buyerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">WhatsApp penerima tiket</dt>
              <dd className="font-mono font-semibold text-ink">{order.buyerPhone}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-line pt-3.5">
            <div className="text-xs font-semibold text-ink">
              Rincian kursi ({order.seats.length})
            </div>
            <ul className="mt-2 space-y-2">
              {order.seats.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between rounded-input border border-line bg-page px-3.5 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: s.zoneColor }}
                    />
                    <span className="font-display font-bold text-ink">Kursi {s.label}</span>
                    <span className="text-muted">• {s.zoneName}</span>
                  </div>
                  <span className="font-semibold text-ink">{formatRupiah(s.price)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3.5 space-y-1.5 border-t border-line pt-3.5 text-xs">
              {order.discountAmount > 0 && (
                <>
                  <div className="flex items-center justify-between text-muted">
                    <span>Subtotal</span>
                    <span className="font-semibold text-ink">
                      {formatRupiah(order.originalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3 text-emerald-700" />
                      <span>Diskon Promo {order.promoCode && `(${order.promoCode})`}</span>
                    </span>
                    <span className="font-semibold text-emerald-800">
                      -{formatRupiah(order.discountAmount)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between border-t border-line/60 pt-2 font-display text-base font-extrabold text-ink">
                <span>Total tagihan</span>
                <span className="text-gate">{formatRupiah(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-input border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p>{errorMessage}</p>
                <Link
                  href={`/e/${order.event.slug}/beli`}
                  className="mt-1.5 inline-block font-bold underline"
                >
                  Pilih kursi
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={submitting !== null || isExpired}
              onClick={() => handleSimulate("SUCCESS")}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {submitting === "SUCCESS"
                  ? "Mengonfirmasi tiket & mengirim WhatsApp..."
                  : "Simulasikan pembayaran berhasil"}
              </span>
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleSimulate("FAILED")}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button border border-rose-300 bg-rose-50/70 px-5 py-3 text-xs font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>
                {submitting === "FAILED"
                  ? "Melepas kursi..."
                  : "Simulasikan pembayaran gagal"}
              </span>
            </button>

            {isExpired && (
              <Link
                href={`/e/${order.event.slug}/beli`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-button border border-line bg-card px-4 py-2.5 text-xs font-semibold text-ink hover:bg-page"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Pilih kursi</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
