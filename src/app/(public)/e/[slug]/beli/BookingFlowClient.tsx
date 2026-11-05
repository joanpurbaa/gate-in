"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  MapPin,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { CountdownBar } from "@/components/seatmap/CountdownBar";
import { SeatMap } from "@/components/seatmap/SeatMap";
import { SelectedSeatsBar, type SelectedSeatSummary } from "@/components/seatmap/SelectedSeatsBar";
import type { SeatEffectiveStatus, SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import type { LayoutV1 } from "@/lib/layout/types";
import { formatRupiah } from "@/lib/money";
import { normalizePhoneTo62 } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";

interface BookingFlowClientProps {
  event: {
    id: string;
    slug: string;
    name: string;
    venueName: string;
    startsAt: string;
    gateOpenAt: string;
    gateCloseAt: string;
    maxSeatsPerOrder: number;
  };
  layout: LayoutV1;
  zones: SeatZoneInfo[];
  initialSeats: SeatMapItem[];
}

interface HeldOrderState {
  orderId: string;
  holdExpiresAt: string;
  totalAmount: number;
  seats: { id: string; label: string; zoneName: string; price: number }[];
  expired: boolean;
}

export function BookingFlowClient({
  event,
  layout,
  zones,
  initialSeats,
}: BookingFlowClientProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhoneRaw, setBuyerPhoneRaw] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [seats, setSeats] = useState<SeatMapItem[]>(initialSeats);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [submittingHold, setSubmittingHold] = useState(false);
  const [releasingHold, setReleasingHold] = useState(false);
  const [heldOrder, setHeldOrder] = useState<HeldOrderState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const refreshSeatStatuses = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.slug}/seats`, { cache: "no-store" });
      if (!res.ok) return;
      const data: {
        seats?: { id: string; label: string; status: SeatEffectiveStatus; zoneId: string | null }[];
      } = await res.json();
      if (!data.seats) return;

      const statusByLabel = new Map(data.seats.map((s) => [s.label, s.status]));

      setSeats((prev) => {
        let changed = false;
        const next = prev.map((seat) => {
          const updatedStatus = statusByLabel.get(seat.label);
          if (updatedStatus && updatedStatus !== seat.status) {
            changed = true;
            return { ...seat, status: updatedStatus };
          }
          return seat;
        });
        return changed ? next : prev;
      });

      setSelectedLabels((prevSelected) => {
        const lost = prevSelected.filter((lbl) => statusByLabel.get(lbl) !== "AVAILABLE");
        if (lost.length > 0) {
          setToast(
            `Kursi ${lost.join(", ")} baru saja diambil pengunjung lain. Silakan pilih kursi lain.`
          );
          return prevSelected.filter((lbl) => statusByLabel.get(lbl) === "AVAILABLE");
        }
        return prevSelected;
      });

      setLastSyncedAt(new Date());
    } catch {
      // Abaikan gangguan jaringan sesaat saat polling
    }
  }, [event.slug]);

  useEffect(() => {
    if (step !== 2) return;
    const id = window.setInterval(refreshSeatStatuses, 5000);
    return () => window.clearInterval(id);
  }, [step, refreshSeatStatuses]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = buyerName.trim();
    if (trimmedName.length < 2) {
      setFormError("Masukkan nama lengkap minimal 2 karakter.");
      return;
    }
    const phone62 = normalizePhoneTo62(buyerPhoneRaw);
    if (!phone62) {
      setFormError(
        "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau 628xxxxxxxxxx (10–15 digit)."
      );
      return;
    }
    setBuyerName(trimmedName);
    setNormalizedPhone(phone62);
    setStep(2);
  };

  const handleToggleSeat = useCallback(
    (seat: SeatMapItem) => {
      if (seat.status !== "AVAILABLE") return;
      setToast(null);
      setSelectedLabels((prev) => {
        if (prev.includes(seat.label)) {
          return prev.filter((l) => l !== seat.label);
        }
        if (prev.length >= event.maxSeatsPerOrder) {
          setToast(`Maksimal ${event.maxSeatsPerOrder} kursi per pesanan.`);
          return prev;
        }
        return [...prev, seat.label];
      });
    },
    [event.maxSeatsPerOrder]
  );

  const selectedSummaries: SelectedSeatSummary[] = useMemo(() => {
    const byLabel = new Map(seats.map((s) => [s.label, s]));
    return selectedLabels
      .map((label) => {
        const seat = byLabel.get(label);
        if (!seat) return null;
        const zone = seat.zoneId ? zoneMap.get(seat.zoneId) : undefined;
        return {
          label,
          zoneName: zone?.name ?? "Reguler",
          zoneColor: zone?.color ?? "#6366F1",
          price: zone?.price ?? 0,
        };
      })
      .filter((x): x is SelectedSeatSummary => x !== null);
  }, [seats, selectedLabels, zoneMap]);

  const handleHoldAndProceed = async () => {
    if (selectedLabels.length === 0 || submittingHold) return;
    setSubmittingHold(true);
    setToast(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          buyerName,
          buyerPhone: normalizedPhone,
          seatLabels: selectedLabels,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.code === "SEATS_TAKEN") {
          const taken: string[] = Array.isArray(data.takenLabels) ? data.takenLabels : [];
          setToast(
            data.error ||
              `Kursi ${taken.join(", ")} baru saja diambil, pilih kursi lain.`
          );
          if (taken.length > 0) {
            const takenSet = new Set(taken);
            setSelectedLabels((prev) => prev.filter((l) => !takenSet.has(l)));
          }
          await refreshSeatStatuses();
          return;
        }
        setToast(data.error || "Gagal menahan kursi. Silakan coba lagi.");
        await refreshSeatStatuses();
        return;
      }

      setHeldOrder({
        orderId: data.orderId,
        holdExpiresAt: data.holdExpiresAt,
        totalAmount: data.totalAmount,
        seats: data.seats,
        expired: false,
      });
      setStep(3);
    } catch {
      setToast("Gagal menghubungi server. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setSubmittingHold(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!heldOrder || releasingHold) return;
    setReleasingHold(true);
    try {
      await fetch(`/api/orders/${heldOrder.orderId}/release`, { method: "POST" });
    } catch {
      // Abaikan bila gagal jaringan; kursi tetap akan rilis saat kadaluwarsa
    } finally {
      setReleasingHold(false);
      setHeldOrder(null);
      setSelectedLabels([]);
      await refreshSeatStatuses();
      setStep(2);
      setToast("Pesanan dibatalkan dan kursi telah dikembalikan ke denah.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 pb-28">
      {/* Header & Stepper */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/e/${event.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Detail Acara</span>
          </Link>
          <h1 className="mt-1 text-lg font-bold text-stone-900 sm:text-xl">{event.name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-stone-600">
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

        {/* Stepper */}
        <ol className="flex items-center gap-2 text-xs font-semibold">
          <li
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
              step === 1
                ? "bg-[#3730A3] text-white"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <span>1. Data Diri</span>
          </li>
          <li
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
              step === 2
                ? "bg-[#3730A3] text-white"
                : step > 2
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-stone-200 bg-stone-100 text-stone-500"
            }`}
          >
            <span>2. Pilih Kursi</span>
          </li>
          <li
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
              step === 3
                ? "bg-[#3730A3] text-white"
                : "border border-stone-200 bg-stone-100 text-stone-500"
            }`}
          >
            <span>3. Ringkasan</span>
          </li>
        </ol>
      </div>

      {toast && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* LANGKAH 1: DATA DIRI */}
      {step === 1 && (
        <section className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#3730A3]">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">Data Pemesan Tiket</h2>
              <p className="text-xs text-stone-600">
                E-ticket dan QR code akan dikirimkan ke nomor WhatsApp ini.
              </p>
            </div>
          </div>

          <form onSubmit={handleStep1Submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="buyerName" className="block text-xs font-semibold text-stone-800">
                Nama Lengkap Peserta
              </label>
              <input
                id="buyerName"
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#3730A3] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="buyerPhone" className="block text-xs font-semibold text-stone-800">
                Nomor WhatsApp Aktif
              </label>
              <input
                id="buyerPhone"
                type="tel"
                inputMode="tel"
                required
                placeholder="Contoh: 082275338090"
                value={buyerPhoneRaw}
                onChange={(e) => setBuyerPhoneRaw(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#3730A3] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Otomatis dinormalisasi ke format internasional 628xxxxxxxxxx.
              </p>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900"
            >
              <span>Lanjut Pilih Kursi di Denah</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      {/* LANGKAH 2: DENAH PEMILIHAN KURSI */}
      {step === 2 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-stone-700">
              <span>
                Pemesan: <strong className="text-stone-900">{buyerName}</strong> ({normalizedPhone})
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-semibold text-[#3730A3] underline"
              >
                Ubah Data Diri
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-stone-500">
              <RefreshCw className="h-3 w-3" />
              <span>
                Status kursi diperbarui otomatis ({lastSyncedAt.toLocaleTimeString("id-ID")})
              </span>
            </div>
          </div>

          <SeatMap
            layout={layout}
            seats={seats}
            zones={zones}
            mode="select"
            selectedLabels={selectedLabels}
            maxSeats={event.maxSeatsPerOrder}
            onToggleSeat={handleToggleSeat}
          />

          <SelectedSeatsBar
            selected={selectedSummaries}
            maxSeats={event.maxSeatsPerOrder}
            loading={submittingHold}
            ctaLabel="Tahan Kursi & Lanjut"
            onRemoveSeat={(lbl) =>
              setSelectedLabels((prev) => prev.filter((item) => item !== lbl))
            }
            onSubmit={handleHoldAndProceed}
          />
        </section>
      )}

      {/* LANGKAH 3: RINGKASAN PESANAN & HITUNG MUNDUR HOLD */}
      {step === 3 && heldOrder && (
        <section className="mx-auto max-w-lg space-y-4">
          <CountdownBar
            expiresAt={heldOrder.holdExpiresAt}
            onExpire={() =>
              setHeldOrder((prev) => (prev ? { ...prev, expired: true } : null))
            }
          />

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="text-base font-bold text-stone-900">Ringkasan Pesanan</h2>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  heldOrder.expired
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {heldOrder.expired ? "KEDALUWARSA" : "KURSI DITAHAN (PENDING)"}
              </span>
            </div>

            <dl className="mt-4 space-y-2 border-t border-stone-200 pt-3.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-stone-500">ID Pesanan</dt>
                <dd className="font-mono font-semibold text-stone-800">{heldOrder.orderId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Nama Pemesan</dt>
                <dd className="font-semibold text-stone-900">{buyerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Nomor WhatsApp</dt>
                <dd className="font-mono font-semibold text-stone-900">{normalizedPhone}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-stone-200 pt-3.5">
              <div className="text-xs font-semibold text-stone-700">
                Kursi yang Ditahan ({heldOrder.seats.length})
              </div>
              <ul className="mt-2 space-y-2">
                {heldOrder.seats.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-stone-900">Kursi {s.label}</span>
                      <span className="ml-2 text-stone-600">• Zona {s.zoneName}</span>
                    </div>
                    <span className="font-semibold text-stone-900">{formatRupiah(s.price)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3.5 flex items-center justify-between border-t border-stone-200 pt-3.5 text-base font-bold text-stone-900">
                <span>Total Pembayaran</span>
                <span>{formatRupiah(heldOrder.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {!heldOrder.expired ? (
                <Link
                  href={`/bayar/${heldOrder.orderId}`}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white"
                >
                  <span>Pilih Kursi Kembali di Denah</span>
                </button>
              )}

              <button
                type="button"
                disabled={releasingHold}
                onClick={handleCancelOrder}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <XCircle className="h-4 w-4 text-stone-500" />
                <span>{releasingHold ? "Membatalkan..." : "Batalkan & Lepas Kursi"}</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
