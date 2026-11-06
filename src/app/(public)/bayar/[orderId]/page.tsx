import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ZONE_COLOR_PALETTE } from "@/components/seatmap/types";
import { prisma } from "@/lib/db";
import { releaseOrderHold } from "@/lib/seats";
import { SimulatePaymentClient } from "./SimulatePaymentClient";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          name: true,
          venueName: true,
          startsAt: true,
        },
      },
      seats: {
        include: {
          zone: true,
        },
        orderBy: { label: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  if (order.status === "PAID") {
    redirect(`/pesanan/${order.id}`);
  }

  const now = new Date();
  const isHoldExpired = order.status === "PENDING" && order.holdExpiresAt <= now;
  if (isHoldExpired) {
    await releaseOrderHold(order.id, "EXPIRED").catch(() => null);
  }

  if (order.status === "FAILED" || order.status === "EXPIRED" || isHoldExpired) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-card border border-rose-200 bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-3 font-display text-lg font-bold text-ink">
            {order.status === "FAILED"
              ? "Pesanan telah dibatalkan"
              : "Waktu tahan kursi telah kedaluwarsa"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Kursi pada pesanan ini telah dilepas kembali agar dapat dipilih pengunjung lain.
            Silakan kembali ke denah acara untuk memilih kursi yang masih tersedia.
          </p>
          <Link
            href={`/e/${order.event.slug}/beli`}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Pilih kursi</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <SimulatePaymentClient
      order={{
        id: order.id,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        totalAmount: order.totalAmount,
        holdExpiresAt: order.holdExpiresAt.toISOString(),
        event: {
          slug: order.event.slug,
          name: order.event.name,
          venueName: order.event.venueName,
          startsAt: order.event.startsAt.toISOString(),
        },
        seats: order.seats.map((s) => ({
          label: s.label,
          zoneName: s.zone?.name ?? "Reguler",
          zoneColor: s.zone?.color ?? ZONE_COLOR_PALETTE[0].hex,
          price: s.zone?.price ?? 0,
        })),
      }}
    />
  );
}
