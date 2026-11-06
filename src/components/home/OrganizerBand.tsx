import React from "react";
import { CheckCircle2, QrCode, ShieldCheck, Ticket } from "lucide-react";

export function OrganizerBand() {
  return (
    <section
      id="keunggulan-gatein"
      aria-label="Keunggulan GateIn"
      className="my-10 overflow-hidden rounded-[24px] border border-line bg-ink px-6 py-8 text-white shadow-lg sm:px-10 sm:py-12"
    >
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ticket backdrop-blur-xs">
            <Ticket className="h-3.5 w-3.5" />
            <span>Pengalaman Menonton Terbaik</span>
          </div>

          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Beli Tiket Lebih Nyaman, Kursi Pasti Sesuai Pilihanmu.
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-sand/80 sm:text-base">
            GateIn menghadirkan denah interaktif 1:1 yang merefleksikan posisi panggung aslinya di
            kawasan Summarecon Bandung. Pilih sendiri tempat duduk ternyaman, amankan secara instan, dan terima
            e-ticket ber-QR code resmi langsung di WhatsApp kamu.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-sand/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-ticket shrink-0" />
              <span className="font-medium">Denah Interaktif 1:1</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ticket shrink-0" />
              <span className="font-medium">Anti Double Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-ticket shrink-0" />
              <span className="font-medium">Tiket WhatsApp Instan</span>
            </div>
          </div>
        </div>

        <a
          href="#daftar-acara"
          className="inline-flex min-h-12 flex-none items-center justify-center gap-2 rounded-button bg-ticket px-7 py-3.5 text-sm font-bold text-ink shadow-sm transition hover:bg-[#c2ed2c] focus-visible:ring-2 focus-visible:ring-ticket"
        >
          <Ticket className="h-4 w-4" />
          <span>Cari & Pesan Kursi</span>
        </a>
      </div>
    </section>
  );
}
