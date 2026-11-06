"use client";

import Link from "next/link";
import { Download, ExternalLink, Calendar, Clock, MapPin, User, CheckCircle2 } from "lucide-react";
import { BRAND_COLORS } from "@/lib/design-tokens";
import { formatRupiah } from "@/lib/money";
import { formatDateTime, formatTimeRange } from "@/lib/time";
import { Logo } from "./Logo";

export interface TicketCardData {
  code: string;
  qrDataUrl: string;
  status: "VALID" | "USED";
  checkedInAt: string | null;
  buyerName: string;
  seatLabel: string;
  zoneName: string;
  zoneColor: string;
  price: number;
  eventName: string;
  eventSlug: string;
  venueName: string;
  startsAt: string;
  gateOpenAt: string;
  gateCloseAt: string;
}

export function TicketCard({
  ticket,
  showSingleLink = true,
}: {
  ticket: TicketCardData;
  showSingleLink?: boolean;
}) {
  const handleDownloadPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Latar kartu putih
    ctx.fillStyle = BRAND_COLORS.card;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Strip atas Gerbang
    ctx.fillStyle = BRAND_COLORS.gate;
    ctx.fillRect(0, 0, canvas.width, 150);

    ctx.fillStyle = BRAND_COLORS.ticket;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("GateIn • Tiket Acara", 40, 52);

    ctx.fillStyle = BRAND_COLORS.card;
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(ticket.eventName.slice(0, 36), 40, 98);

    ctx.fillStyle = BRAND_COLORS.line;
    ctx.font = "18px sans-serif";
    ctx.fillText(ticket.venueName.slice(0, 48), 40, 130);

    // Kotak kursi & zona
    ctx.fillStyle = BRAND_COLORS.page;
    ctx.strokeStyle = BRAND_COLORS.line;
    ctx.lineWidth = 2;
    ctx.fillRect(40, 180, 640, 130);
    ctx.strokeRect(40, 180, 640, 130);

    ctx.fillStyle = BRAND_COLORS.muted;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Nomor kursi", 68, 218);
    ctx.fillText("Zona", 280, 218);
    ctx.fillText("Pemegang tiket", 500, 218);

    ctx.fillStyle = BRAND_COLORS.ink;
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(ticket.seatLabel, 68, 274);

    ctx.fillStyle = BRAND_COLORS.ink;
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(ticket.zoneName, 280, 265);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = BRAND_COLORS.muted;
    ctx.fillText(formatRupiah(ticket.price), 280, 292);

    ctx.fillStyle = BRAND_COLORS.ink;
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(ticket.buyerName.slice(0, 18), 500, 265);

    // Info jadwal
    ctx.fillStyle = BRAND_COLORS.ink;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`Jadwal acara: ${formatDateTime(ticket.startsAt)}`, 40, 355);
    ctx.fillStyle = BRAND_COLORS.gate;
    ctx.fillText(
      `Jam open gate: ${formatTimeRange(ticket.gateOpenAt, ticket.gateCloseAt)}`,
      40,
      388
    );

    // Gambar QR
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = BRAND_COLORS.card;
      ctx.fillRect(180, 420, 360, 360);
      ctx.strokeRect(180, 420, 360, 360);
      ctx.drawImage(img, 195, 435, 330, 330);

      ctx.fillStyle = BRAND_COLORS.muted;
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Kode tiket", 360, 825);

      ctx.fillStyle = BRAND_COLORS.ink;
      ctx.font = "bold 40px monospace";
      ctx.fillText(ticket.code, 360, 875);

      ctx.fillStyle = BRAND_COLORS.muted;
      ctx.font = "16px sans-serif";
      ctx.fillText("Tunjukkan QR ini kepada panitia saat masuk area acara.", 360, 930);

      const link = document.createElement("a");
      link.download = `tiket-${ticket.seatLabel}-${ticket.code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = ticket.qrDataUrl;
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card">
      {/* Strip atas Gerbang dengan mark GateIn */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gate px-5 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <Logo variant="reversed" size="sm" />
          <span className="hidden text-xs text-white/80 sm:inline">•</span>
          <h3 className="font-display text-base font-bold sm:text-lg">{ticket.eventName}</h3>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            ticket.status === "USED"
              ? "bg-white/20 text-white"
              : "bg-ticket text-ink"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{ticket.status === "USED" ? "Sudah digunakan" : "Tiket aktif"}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-12 sm:p-6">
        {/* Kolom Info Kursi & Jadwal */}
        <div className="flex flex-col justify-between sm:col-span-7">
          <div>
            <div className="grid grid-cols-2 gap-3 rounded-input border border-line bg-page p-3.5">
              <div>
                <span className="block text-xs font-medium text-muted">Nomor kursi</span>
                <span className="mt-0.5 block font-display text-3xl font-extrabold text-ink">
                  {ticket.seatLabel}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-muted">Zona</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-xs"
                    style={{ backgroundColor: ticket.zoneColor }}
                  />
                  <span className="text-sm font-bold text-ink">{ticket.zoneName}</span>
                </div>
                <span className="text-xs font-medium text-muted">
                  {formatRupiah(ticket.price)}
                </span>
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-xs text-ink">
              <div className="flex items-start gap-2.5">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate" />
                <div>
                  <span className="text-muted">Pemegang tiket: </span>
                  <strong className="font-semibold text-ink">{ticket.buyerName}</strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate" />
                <div>
                  <span className="text-muted">Waktu acara: </span>
                  <strong className="font-semibold text-ink">
                    {formatDateTime(ticket.startsAt)}
                  </strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate" />
                <div>
                  <span className="text-muted">Jam open gate: </span>
                  <strong className="font-semibold text-gate">
                    {formatTimeRange(ticket.gateOpenAt, ticket.gateCloseAt)}
                  </strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate" />
                <div>
                  <span className="text-muted">Lokasi: </span>
                  <strong className="font-semibold text-ink">{ticket.venueName}</strong>
                </div>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-button bg-gate px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong sm:min-h-10"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Simpan gambar tiket</span>
            </button>
            {showSingleLink && (
              <Link
                href={`/tiket/${ticket.code}`}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-button border border-line bg-card px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-page sm:min-h-10"
              >
                <span>Layar penuh QR</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Kolom QR & Kode */}
        <div className="flex flex-col items-center justify-center rounded-input border border-dashed border-line bg-page p-4 sm:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ticket.qrDataUrl}
            alt={`QR Tiket ${ticket.code}`}
            className="h-48 w-48 rounded-input border border-line bg-card p-2 sm:h-52 sm:w-52"
          />
          <span className="mt-2.5 text-xs font-medium text-muted">Kode tiket</span>
          <span className="mt-0.5 font-mono text-xl font-bold tracking-wider text-ink">
            {ticket.code}
          </span>
        </div>
      </div>
    </div>
  );
}
