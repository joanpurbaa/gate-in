import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { ZONE_COLOR_PALETTE } from "@/components/seatmap/types";
import { TicketCard, type TicketCardData } from "@/components/ui/TicketCard";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { ticketCodeToQrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function OrderResultPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      tickets: {
        include: {
          seat: {
            include: { zone: true },
          },
        },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const now = new Date();
  if (order.status === "PENDING" && order.holdExpiresAt > now) {
    redirect(`/bayar/${order.id}`);
  }

  if (order.status !== "PAID") {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-card border border-rose-200 bg-card p-6 text-center">
          {order.status === "FAILED" ? (
            <XCircle className="mx-auto h-10 w-10 text-rose-600" />
          ) : (
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          )}
          <h1 className="mt-3 font-display text-lg font-bold text-ink">
            {order.status === "FAILED"
              ? "Pembayaran gagal atau dibatalkan"
              : "Pesanan telah kedaluwarsa"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Kursi yang sebelumnya ditahan untuk pesanan{" "}
            <span className="font-mono font-semibold text-ink">{order.id}</span> telah
            dikembalikan ke denah dan tersedia kembali.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/e/${order.event.slug}/beli`}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Pilih kursi</span>
            </Link>
            <Link
              href={`/e/${order.event.slug}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-line bg-card px-4 py-2 text-xs font-semibold text-ink hover:bg-page"
            >
              Kembali ke halaman acara
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const ticketCards: TicketCardData[] = await Promise.all(
    order.tickets.map(async (t) => ({
      code: t.code,
      qrDataUrl: await ticketCodeToQrDataUrl(t.code),
      status: t.status,
      checkedInAt: t.checkedInAt?.toISOString() ?? null,
      buyerName: order.buyerName,
      seatLabel: t.seat.label,
      zoneName: t.seat.zone?.name ?? "Reguler",
      zoneColor: t.seat.zone?.color ?? ZONE_COLOR_PALETTE[0].hex,
      price: t.seat.zone?.price ?? 0,
      eventName: order.event.name,
      eventSlug: order.event.slug,
      venueName: order.event.venueName,
      startsAt: order.event.startsAt.toISOString(),
      gateOpenAt: order.event.gateOpenAt.toISOString(),
      gateCloseAt: order.event.gateCloseAt.toISOString(),
    }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="mb-6 rounded-card border border-emerald-200 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <h1 className="font-display text-lg font-bold text-ink sm:text-xl">
                Pembayaran berhasil — tiketmu siap digunakan
              </h1>
              <p className="text-xs text-muted">
                ID pesanan: <span className="font-mono font-semibold">{order.id}</span> • Total:{" "}
                <strong className="text-ink">{formatRupiah(order.totalAmount)}</strong>
              </p>
            </div>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            Lunas ({ticketCards.length} tiket)
          </span>
        </div>

        {/* Status pengiriman WhatsApp */}
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-input border px-3.5 py-2.5 text-xs ${
            order.waStatus === "SENT"
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              : order.waStatus === "FAILED"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-line bg-page text-ink"
          }`}
        >
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {order.waStatus === "SENT" ? (
              <span>
                Tiket dan tautan QR juga telah dikirimkan ke WhatsApp{" "}
                <strong className="font-mono">{order.buyerPhone}</strong>.
              </span>
            ) : order.waStatus === "FAILED" ? (
              <span>
                Pengiriman WhatsApp ke <strong className="font-mono">{order.buyerPhone}</strong>{" "}
                mengalami kendala ({order.waError || "gangguan jaringan"}), namun{" "}
                <strong>seluruh tiketmu tetap sah dan dapat langsung digunakan di halaman ini</strong>.
              </span>
            ) : (
              <span>
                Simpan halaman ini atau unduh gambar tiket di bawah untuk ditunjukkan saat check-in.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {ticketCards.map((t) => (
          <TicketCard key={t.code} ticket={t} showSingleLink={true} />
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href={`/e/${order.event.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gate hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke halaman acara</span>
        </Link>
      </div>
    </main>
  );
}
