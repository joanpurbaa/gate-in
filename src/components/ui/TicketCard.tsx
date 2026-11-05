"use client";

import Link from "next/link";
import { Download, ExternalLink, Calendar, Clock, MapPin, User, CheckCircle2 } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { formatDateTime, formatTimeRange } from "@/lib/time";

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

    // Latar kartu putih hangat
    ctx.fillStyle = "#FAFAF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header indigo
    ctx.fillStyle = "#1E1B4B";
    ctx.fillRect(0, 0, canvas.width, 150);

    ctx.fillStyle = "#A5B4FC";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("E-TICKET RESMI • GATEIN BANDUNG", 40, 52);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(ticket.eventName.slice(0, 36), 40, 98);

    ctx.fillStyle = "#E0E7FF";
    ctx.font = "18px sans-serif";
    ctx.fillText(ticket.venueName.slice(0, 48), 40, 130);

    // Kotak kursi & zona
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E7E5E4";
    ctx.lineWidth = 2;
    ctx.fillRect(40, 180, 640, 130);
    ctx.strokeRect(40, 180, 640, 130);

    ctx.fillStyle = "#57534E";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("NOMOR KURSI", 68, 218);
    ctx.fillText("ZONA / KATEGORI", 280, 218);
    ctx.fillText("PEMILIK TIKET", 500, 218);

    ctx.fillStyle = "#3730A3";
    ctx.font = "bold 42px monospace";
    ctx.fillText(ticket.seatLabel, 68, 272);

    ctx.fillStyle = "#171717";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(ticket.zoneName, 280, 265);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#57534E";
    ctx.fillText(formatRupiah(ticket.price), 280, 292);

    ctx.fillStyle = "#171717";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(ticket.buyerName.slice(0, 18), 500, 265);

    // Info jadwal
    ctx.fillStyle = "#171717";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`Jadwal Acara: ${formatDateTime(ticket.startsAt)}`, 40, 355);
    ctx.fillStyle = "#3730A3";
    ctx.fillText(
      `Jam Open Gate: ${formatTimeRange(ticket.gateOpenAt, ticket.gateCloseAt)}`,
      40,
      388
    );

    // Gambar QR
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(180, 420, 360, 360);
      ctx.strokeRect(180, 420, 360, 360);
      ctx.drawImage(img, 195, 435, 330, 330);

      ctx.fillStyle = "#57534E";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KODE TIKET VERIFIKASI CHECK-IN", 360, 825);

      ctx.fillStyle = "#171717";
      ctx.font = "bold 40px monospace";
      ctx.fillText(ticket.code, 360, 875);

      ctx.fillStyle = "#78716C";
      ctx.font = "16px sans-serif";
      ctx.fillText("Tunjukkan QR code ini kepada panitia saat memasuki area acara.", 360, 930);

      const link = document.createElement("a");
      link.download = `tiket-${ticket.seatLabel}-${ticket.code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = ticket.qrDataUrl;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
      {/* Header Tiket */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1E1B4B] px-5 py-4 text-white">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
            E-Ticket Resmi • 1 Kursi 1 QR
          </span>
          <h3 className="text-base font-bold sm:text-lg">{ticket.eventName}</h3>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
            ticket.status === "USED"
              ? "bg-green-500/20 text-green-200 border border-green-400/40"
              : "bg-indigo-500/25 text-indigo-100 border border-indigo-400/30"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{ticket.status === "USED" ? "SUDAH CHECK-IN (HADIR)" : "TIKET AKTIF (VALID)"}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-12 sm:p-6">
        {/* Kolom Info Kursi & Jadwal */}
        <div className="flex flex-col justify-between sm:col-span-7">
          <div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-[#FAFAF7] p-3.5">
              <div>
                <span className="block text-[11px] font-semibold uppercase text-stone-500">
                  Nomor Kursi
                </span>
                <span className="mt-0.5 block font-mono text-2xl font-bold text-[#3730A3]">
                  {ticket.seatLabel}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase text-stone-500">
                  Zona Kategori
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-xs"
                    style={{ backgroundColor: ticket.zoneColor }}
                  />
                  <span className="text-sm font-bold text-stone-900">{ticket.zoneName}</span>
                </div>
                <span className="text-xs font-medium text-stone-600">
                  {formatRupiah(ticket.price)}
                </span>
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-xs text-stone-700">
              <div className="flex items-start gap-2.5">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
                <div>
                  <span className="text-stone-500">Pemegang Tiket: </span>
                  <strong className="font-semibold text-stone-900">{ticket.buyerName}</strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
                <div>
                  <span className="text-stone-500">Waktu Acara: </span>
                  <strong className="font-semibold text-stone-900">
                    {formatDateTime(ticket.startsAt)}
                  </strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
                <div>
                  <span className="text-stone-500">Jam Open Gate: </span>
                  <strong className="font-semibold text-[#3730A3]">
                    {formatTimeRange(ticket.gateOpenAt, ticket.gateCloseAt)}
                  </strong>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3730A3]" />
                <div>
                  <span className="text-stone-500">Lokasi: </span>
                  <strong className="font-semibold text-stone-900">{ticket.venueName}</strong>
                </div>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3730A3] px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-900"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Simpan Gambar Tiket</span>
            </button>
            {showSingleLink && (
              <Link
                href={`/tiket/${ticket.code}`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                <span>Layar Penuh QR</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Kolom QR & Kode */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-[#FAFAF7] p-4 sm:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ticket.qrDataUrl}
            alt={`QR Tiket ${ticket.code}`}
            className="h-48 w-48 rounded-xl border border-stone-200 bg-white p-2 shadow-2xs sm:h-52 sm:w-52"
          />
          <span className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            Kode Tiket
          </span>
          <span className="mt-0.5 font-mono text-xl font-bold tracking-wider text-stone-900">
            {ticket.code}
          </span>
        </div>
      </div>
    </div>
  );
}
