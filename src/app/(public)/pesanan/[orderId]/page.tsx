import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from "lucide-react";
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
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          {order.status === "FAILED" ? (
            <XCircle className="mx-auto h-10 w-10 text-rose-600" />
          ) : (
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
          )}
          <h1 className="mt-3 text-lg font-bold text-stone-900">
            {order.status === "FAILED"
              ? "Pembayaran Gagal / Dibatalkan"
              : "Pesanan Telah Kedaluwarsa"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            Kursi yang sebelumnya ditahan untuk pesanan{" "}
            <span className="font-mono font-semibold text-stone-800">{order.id}</span> telah
            dikembalikan ke denah dan tersedia kembali. Anda dapat mengulangi pemesanan kapan saja.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/e/${order.event.slug}/beli`}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Pilih Kursi Lagi di Denah</span>
            </Link>
            <Link
              href={`/e/${order.event.slug}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Kembali ke Halaman Acara
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
      zoneColor: t.seat.zone?.color ?? "#6366F1",
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
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-stone-900 sm:text-xl">
                Pembayaran Berhasil — E-Ticket Siap Digunakan
              </h1>
              <p className="text-xs text-stone-600">
                ID Pesanan: <span className="font-mono font-semibold">{order.id}</span> • Total:{" "}
                <strong className="text-stone-900">{formatRupiah(order.totalAmount)}</strong>
              </p>
            </div>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            LUNAS ({ticketCards.length} TIKET)
          </span>
        </div>

        {/* Status pengiriman WhatsApp */}
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
            order.waStatus === "SENT"
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              : order.waStatus === "FAILED"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
        >
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {order.waStatus === "SENT" ? (
              <span>
                E-ticket dan tautan QR juga telah dikirimkan ke WhatsApp{" "}
                <strong className="font-mono">{order.buyerPhone}</strong>.
              </span>
            ) : order.waStatus === "FAILED" ? (
              <span>
                Pengiriman WhatsApp ke <strong className="font-mono">{order.buyerPhone}</strong>{" "}
                mengalami kendala ({order.waError || "gangguan jaringan"}), namun{" "}
                <strong>seluruh tiket Anda tetap sah dan dapat langsung digunakan di halaman ini</strong>.
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3730A3] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Halaman Acara</span>
        </Link>
      </div>
    </main>
  );
}
