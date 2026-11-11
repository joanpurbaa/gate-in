import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { computeSaleState } from "@/components/ui/StatusPill";
import { getCachedBookingEvent } from "@/lib/cache";
import { parseLayout } from "@/lib/layout/validate";
import { getWaitingListStatus } from "@/lib/waiting-list/service";
import { BookingFlowClient } from "./BookingFlowClient";

export const dynamic = "force-dynamic";

export default async function EventBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ offer?: string }>;
}) {
  const { slug } = await params;
  const { offer: offerToken } = await searchParams;

  const event = await getCachedBookingEvent(slug);

  if (!event || event.status !== "PUBLISHED" || !event.layout) {
    notFound();
  }

  const now = new Date();

  // Validasi penawaran waiting list (jika pembeli datang via link penawaran)
  let activeOffer: {
    token: string;
    zoneId: string;
    zoneName: string;
    quantity: number;
    buyerName: string;
    buyerPhone: string;
  } | null = null;

  if (typeof offerToken === "string" && offerToken.trim()) {
    const offerData = await getWaitingListStatus(offerToken.trim());
    if (
      offerData &&
      offerData.eventId === event.id &&
      offerData.status === "OFFERED" &&
      (!offerData.offerExpiresAt || new Date(offerData.offerExpiresAt) > now)
    ) {
      activeOffer = {
        token: offerData.token,
        zoneId: offerData.zoneId,
        zoneName: offerData.zoneName,
        quantity: offerData.quantity,
        buyerName: offerData.buyerName,
        buyerPhone: offerData.buyerPhone,
      };
    }
  }

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

  // Jika pembeli memiliki activeOffer valid, perbolehkan memilih kursi walau event umum sold out
  const canAccess = saleState === "OPEN" || (activeOffer !== null && saleState === "SOLD_OUT");

  if (!canAccess) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-card border border-line bg-card p-6">
          <h1 className="font-display text-lg font-bold text-ink">
            Penjualan tiket tidak sedang aktif
          </h1>
          <p className="mt-2 text-xs text-muted">
            {saleState === "SOLD_OUT"
              ? "Seluruh kursi untuk acara ini telah habis terjual."
              : saleState === "UPCOMING"
                ? "Penjualan tiket untuk acara ini belum dibuka."
                : "Periode penjualan tiket untuk acara ini telah berakhir."}
          </p>
          <Link
            href={`/e/${event.slug}`}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-button bg-gate px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gate-strong"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke halaman acara</span>
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
        maxSeatsPerOrder: activeOffer ? activeOffer.quantity : event.maxSeatsPerOrder,
      }}
      layout={layout}
      zones={event.zones}
      initialSeats={initialSeats}
      offer={activeOffer ?? undefined}
    />
  );
}
