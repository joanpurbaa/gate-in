import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
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
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-3 text-lg font-bold text-stone-900">
            {order.status === "FAILED"
              ? "Pesanan Telah Dibatalkan / Gagal Dibayar"
              : "Waktu Tahan Kursi Telah Kedaluwarsa"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            Kursi pada pesanan ini telah dilepas kembali agar dapat dipilih pengunjung lain.
            Silakan kembali ke denah acara untuk memilih kursi yang masih tersedia.
          </p>
          <Link
            href={`/e/${order.event.slug}/beli`}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali Pilih Kursi di Denah</span>
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
          zoneColor: s.zone?.color ?? "#6366F1",
          price: s.zone?.price ?? 0,
        })),
      }}
    />
  );
}
