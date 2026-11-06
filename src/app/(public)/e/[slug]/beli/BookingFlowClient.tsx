"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  MapPin,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { SeatMap } from "@/components/seatmap/SeatMap";
import { SelectedSeatsBar, type SelectedSeatSummary } from "@/components/seatmap/SelectedSeatsBar";
import { CheckoutDrawer, type AppliedPromoInfo } from "@/components/seatmap/CheckoutDrawer";
import {
  ZONE_COLOR_PALETTE,
  type SeatEffectiveStatus,
  type SeatMapItem,
  type SeatZoneInfo,
} from "@/components/seatmap/types";
import type { LayoutV1 } from "@/lib/layout/types";
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
  offer?: {
    token: string;
    zoneId: string;
    zoneName: string;
    quantity: number;
    buyerName: string;
    buyerPhone: string;
  };
}

export function BookingFlowClient({
  event,
  layout,
  zones,
  initialSeats,
  offer,
}: BookingFlowClientProps) {
  const router = useRouter();

  // State data pemesan (tersimpan saat beralih antara denah dan drawer)
  const [buyerName, setBuyerName] = useState(offer?.buyerName || "");
  const [buyerPhoneRaw, setBuyerPhoneRaw] = useState(offer?.buyerPhone || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);

  // State pemilihan kursi
  const [seats, setSeats] = useState<SeatMapItem[]>(initialSeats);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [submittingHold, setSubmittingHold] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Promo otomatis nonaktif jika tidak ada kursi terpilih
  const effectivePromo = selectedLabels.length > 0 ? appliedPromo : null;

  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  // Polling ketersediaan kursi secara berkala
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
            `Kursi ${lost.join(", ")} baru saja diambil pembeli lain. Pilih kursi lain, denah sudah diperbarui.`
          );
          return prevSelected.filter((lbl) => statusByLabel.get(lbl) === "AVAILABLE");
        }
        return prevSelected;
      });

      setLastSyncedAt(new Date());
    } catch {
      // Abaikan kegagalan jaringan sesaat saat polling background
    }
  }, [event.slug]);

  useEffect(() => {
    const id = window.setInterval(refreshSeatStatuses, 5000);
    return () => window.clearInterval(id);
  }, [refreshSeatStatuses]);

  // Handler pemilihan/pembatalan kursi pada denah
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

  const handleRemoveSeat = useCallback((label: string) => {
    setSelectedLabels((prev) => {
      const next = prev.filter((item) => item !== label);
      if (next.length === 0) {
        setIsCheckoutOpen(false);
      }
      return next;
    });
  }, []);

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
          zoneColor: zone?.color ?? ZONE_COLOR_PALETTE[0].hex,
          price: zone?.price ?? 0,
        };
      })
      .filter((x): x is SelectedSeatSummary => x !== null);
  }, [seats, selectedLabels, zoneMap]);

  // Handler konfirmasi checkout & atomic seat locking
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabels.length === 0 || submittingHold) return;

    setFormError(null);

    const trimmedName = buyerName.trim();
    if (trimmedName.length < 2) {
      setFormError("Masukkan nama lengkap minimal 2 karakter.");
      return;
    }

    const phone62 = normalizePhoneTo62(buyerPhoneRaw);
    if (!phone62) {
      setFormError(
        "Nomor WhatsApp wajib diawali 08xx dan ditulis tanpa spasi (contoh: 081212341224, 10–15 digit)."
      );
      return;
    }

    setSubmittingHold(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          buyerName: trimmedName,
          buyerPhone: phone62,
          seatLabels: selectedLabels,
          offerToken: offer?.token,
          promoCode: effectivePromo?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.code === "SEATS_TAKEN") {
          const taken: string[] = Array.isArray(data.takenLabels) ? data.takenLabels : [];
          setIsCheckoutOpen(false);
          setToast(
            taken.length > 0
              ? `Kursi ${taken.join(", ")} baru saja diambil pembeli lain. Silakan pilih kursi lain yang tersedia.`
              : data.error || "Kursi baru saja diambil. Pilih kursi lain, denah sudah diperbarui."
          );
          if (taken.length > 0) {
            const takenSet = new Set(taken);
            setSelectedLabels((prev) => prev.filter((l) => !takenSet.has(l)));
          }
          await refreshSeatStatuses();
          return;
        }

        setFormError(data.error || "Gagal menahan kursi. Silakan coba lagi.");
        await refreshSeatStatuses();
        return;
      }

      // Berhasil mengunci kursi (HTTP 201) -> Langsung diarahkan ke halaman pembayaran!
      router.push(`/bayar/${data.orderId}`);
    } catch {
      setFormError("Gagal menghubungi server. Periksa koneksi internetmu dan coba lagi.");
    } finally {
      setSubmittingHold(false);
    }
  };

  const handleCloseCheckout = useCallback(() => {
    if (!submittingHold) {
      setIsCheckoutOpen(false);
      setFormError(null);
    }
  }, [submittingHold]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 pb-28">
      {/* Header Denah Pemilihan Kursi */}
      <div className="mb-4 flex flex-col gap-3 rounded-card border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/e/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke detail acara</span>
          </Link>
          <h1 className="mt-1 font-display text-lg font-bold text-ink sm:text-xl">{event.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gate" />
              {formatDateTime(event.startsAt)}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gate" />
              {event.venueName}
            </span>
          </div>
        </div>

        {/* Status Sinkronisasi Real-Time & Batas Tiket */}
        <div className="flex flex-col items-start gap-1 text-xs text-muted sm:items-end">
          <div className="flex items-center gap-1.5 rounded-full bg-page px-3 py-1 font-medium text-ink border border-line">
            <Ticket className="h-3.5 w-3.5 text-gate" />
            <span>Maksimal {event.maxSeatsPerOrder} kursi per pesanan</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <RefreshCw className="h-3 w-3 animate-spin duration-3000 text-gate" />
            <span>Diperbarui ({lastSyncedAt.toLocaleTimeString("id-ID")})</span>
          </div>
        </div>
      </div>

      {/* Banner Penawaran Waiting List Aktif */}
      {offer && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="font-bold">Penawaran Waiting List Aktif:</span> Anda
              mendapatkan alokasi <strong>{offer.quantity} kursi</strong> pada zona{" "}
              <strong>{offer.zoneName}</strong>.
            </div>
          </div>
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
            Eksklusif
          </span>
        </div>
      )}

      {/* Alert / Toast Kursi Bentrok atau Batas Kursi */}
      {toast && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-2 rounded-input border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-bold underline hover:text-amber-950"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Denah Kursi Interaktif (Langsung Aktif Tanpa Form Penghalang) */}
      <section aria-label="Denah Pemilihan Kursi">
        <SeatMap
          layout={layout}
          seats={seats}
          zones={zones}
          mode="select"
          selectedLabels={selectedLabels}
          maxSeats={event.maxSeatsPerOrder}
          onToggleSeat={handleToggleSeat}
        />

        {/* Bar Bawah Ringkasan Kursi Terpilih */}
        <SelectedSeatsBar
          selected={selectedSummaries}
          maxSeats={event.maxSeatsPerOrder}
          loading={submittingHold}
          ctaLabel={
            selectedLabels.length > 0
              ? `Lanjut ke checkout (${selectedLabels.length})`
              : "Pilih kursi pada denah"
          }
          onRemoveSeat={handleRemoveSeat}
          onSubmit={() => {
            if (selectedLabels.length > 0) {
              setFormError(null);
              setIsCheckoutOpen(true);
            }
          }}
        />
      </section>

      {/* Drawer / Modal Checkout Terintegrasi */}
      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        onClose={handleCloseCheckout}
        event={{
          id: event.id,
          name: event.name,
          venueName: event.venueName,
          startsAt: event.startsAt,
        }}
        selectedSeats={selectedSummaries}
        onRemoveSeat={handleRemoveSeat}
        buyerName={buyerName}
        onBuyerNameChange={setBuyerName}
        buyerPhone={buyerPhoneRaw}
        onBuyerPhoneChange={setBuyerPhoneRaw}
        appliedPromo={effectivePromo}
        onApplyPromo={setAppliedPromo}
        onSubmit={handleConfirmOrder}
        isSubmitting={submittingHold}
        errorMessage={formError}
      />
    </main>
  );
}
