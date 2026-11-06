"use client";

import React, { useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  Lock,
  MapPin,
  Phone,
  User,
  X,
  Loader2,
} from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import type { SelectedSeatSummary } from "./SelectedSeatsBar";

export interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    name: string;
    venueName: string;
    startsAt: string;
  };
  selectedSeats: SelectedSeatSummary[];
  onRemoveSeat: (label: string) => void;
  buyerName: string;
  onBuyerNameChange: (val: string) => void;
  buyerPhone: string;
  onBuyerPhoneChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function CheckoutDrawer({
  isOpen,
  onClose,
  event,
  selectedSeats,
  onRemoveSeat,
  buyerName,
  onBuyerNameChange,
  buyerPhone,
  onBuyerPhoneChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: CheckoutDrawerProps) {
  const totalAmount = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  // Kunci scroll latar dan tangani Escape saat terbuka
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-xs transition-opacity duration-200 sm:items-center sm:p-4"
    >
      {/* Backdrop click handler */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Drawer / Modal Container */}
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] border-t border-line bg-card shadow-2xl transition-all sm:max-w-lg sm:rounded-[24px] sm:border">
        {/* Header Drawer */}
        <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
          <div className="pr-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gate">
              <Lock className="h-3.5 w-3.5" />
              <span>Checkout Terintegrasi</span>
            </div>
            <h2
              id="checkout-dialog-title"
              className="mt-0.5 font-display text-lg font-bold text-ink sm:text-xl"
            >
              Data Pemesan & Konfirmasi
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gate" />
                {formatDateTime(event.startsAt)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gate" />
                {event.venueName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup form checkout"
            className="rounded-full p-1.5 text-muted hover:bg-page hover:text-ink disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-6">
          <div className="space-y-5">
            {/* 1. Ringkasan Kursi & Zona */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>Kursi yang dipilih ({selectedSeats.length})</span>
                <span className="text-muted font-normal">Harga resmi</span>
              </div>

              <div className="mt-2 divide-y divide-line rounded-input border border-line bg-page">
                {selectedSeats.map((seat) => (
                  <div
                    key={seat.label}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-xs"
                        style={{ backgroundColor: seat.zoneColor }}
                      />
                      <span className="font-display font-bold text-ink">
                        Kursi {seat.label}
                      </span>
                      <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted border border-line">
                        Zona {seat.zoneName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-ink">
                        {formatRupiah(seat.price)}
                      </span>
                      {selectedSeats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveSeat(seat.label)}
                          disabled={isSubmitting}
                          aria-label={`Lepas kursi ${seat.label}`}
                          className="rounded-full p-1 text-muted hover:bg-line hover:text-ink disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Subtotal & Total */}
                <div className="flex items-center justify-between bg-card/60 px-3.5 py-3 text-xs font-bold text-ink">
                  <span>Total Pembayaran</span>
                  <span className="font-display text-sm font-extrabold text-gate">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Formulir Data Diri Pemesan */}
            <div className="space-y-3.5">
              <div className="text-xs font-semibold text-ink">
                Informasi Kontak Pemesan
              </div>

              <div>
                <label
                  htmlFor="checkout-buyer-name"
                  className="block text-xs font-semibold text-ink"
                >
                  Nama lengkap peserta
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="checkout-buyer-name"
                    name="buyerName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    placeholder="Contoh: Budi Santoso"
                    value={buyerName}
                    onChange={(e) => onBuyerNameChange(e.target.value)}
                    className="min-h-11 w-full rounded-input border border-line bg-card pl-9.5 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="checkout-buyer-phone"
                  className="block text-xs font-semibold text-ink"
                >
                  Nomor WhatsApp aktif
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="checkout-buyer-phone"
                    name="buyerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    disabled={isSubmitting}
                    placeholder="Contoh: 082275338090"
                    value={buyerPhone}
                    onChange={(e) => onBuyerPhoneChange(e.target.value)}
                    className="min-h-11 w-full rounded-input border border-line bg-card pl-9.5 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  E-ticket dan QR code akan otomatis dikirimkan ke nomor WhatsApp ini.
                </p>
              </div>
            </div>

            {/* Alert Error Jika Ada */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-input border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5 pt-3">
            <button
              type="submit"
              disabled={isSubmitting || selectedSeats.length === 0}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gate-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memvalidasi & mengunci kursi...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Konfirmasi & tahan kursi</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-line bg-card px-4 py-2.5 text-xs font-semibold text-muted hover:bg-page hover:text-ink disabled:opacity-50"
            >
              Kembali pilih kursi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
