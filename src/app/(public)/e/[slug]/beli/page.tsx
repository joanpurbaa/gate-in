import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { computeSaleState } from "@/components/ui/StatusPill";
import { prisma } from "@/lib/db";
import { parseLayout } from "@/lib/layout/validate";
import { BookingFlowClient } from "./BookingFlowClient";

export const dynamic = "force-dynamic";

export default async function EventBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      seats: {
        orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
        select: {
          id: true,
          label: true,
          rowLabel: true,
          number: true,
          x: true,
          y: true,
          rotation: true,
          status: true,
          heldUntil: true,
          zoneId: true,
        },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED" || !event.layout) {
    notFound();
  }

  const now = new Date();
  const initialSeats = event.seats.map((s) => {
    const expired = s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now);
    return {
      id: s.id,
      label: s.label,
      rowLabel: s.rowLabel,
      number: s.number,
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      zoneId: s.zoneId,
      status: expired ? ("AVAILABLE" as const) : s.status,
    };
  });

  const availableCount = initialSeats.filter((s) => s.status === "AVAILABLE").length;
  const saleState = computeSaleState({
    salesOpenAt: event.salesOpenAt,
    salesCloseAt: event.salesCloseAt,
    availableCount,
    now,
  });

  if (saleState !== "OPEN") {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
          <h1 className="text-lg font-bold text-stone-900">
            Penjualan Tiket Tidak Sedang Aktif
          </h1>
          <p className="mt-2 text-xs text-stone-600">
            {saleState === "SOLD_OUT"
              ? "Seluruh kursi untuk acara ini telah habis terjual."
              : saleState === "UPCOMING"
                ? "Penjualan tiket untuk acara ini belum dibuka."
                : "Periode penjualan tiket untuk acara ini telah berakhir."}
          </p>
          <Link
            href={`/e/${event.slug}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3730A3] px-5 py-2.5 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Halaman Acara</span>
          </Link>
        </div>
      </main>
    );
  }

  const layout = parseLayout(event.layout);

  return (
    <BookingFlowClient
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        venueName: event.venueName,
        startsAt: event.startsAt.toISOString(),
        gateOpenAt: event.gateOpenAt.toISOString(),
        gateCloseAt: event.gateCloseAt.toISOString(),
        maxSeatsPerOrder: event.maxSeatsPerOrder,
      }}
      layout={layout}
      zones={event.zones}
      initialSeats={initialSeats}
    />
  );
}
