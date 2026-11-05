import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TicketCard, type TicketCardData } from "@/components/ui/TicketCard";
import { prisma } from "@/lib/db";
import { ticketCodeToQrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function SingleTicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const ticket = await prisma.ticket.findUnique({
    where: { code: normalizedCode },
    include: {
      order: true,
      event: true,
      seat: {
        include: { zone: true },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const cardData: TicketCardData = {
    code: ticket.code,
    qrDataUrl: await ticketCodeToQrDataUrl(ticket.code),
    status: ticket.status,
    checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
    buyerName: ticket.order.buyerName,
    seatLabel: ticket.seat.label,
    zoneName: ticket.seat.zone?.name ?? "Reguler",
    zoneColor: ticket.seat.zone?.color ?? "#6366F1",
    price: ticket.seat.zone?.price ?? 0,
    eventName: ticket.event.name,
    eventSlug: ticket.event.slug,
    venueName: ticket.event.venueName,
    startsAt: ticket.event.startsAt.toISOString(),
    gateOpenAt: ticket.event.gateOpenAt.toISOString(),
    gateCloseAt: ticket.event.gateCloseAt.toISOString(),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/pesanan/${ticket.orderId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Semua Tiket di Pesanan Ini</span>
        </Link>
        <span className="font-mono text-xs font-bold text-stone-500">Kode: {ticket.code}</span>
      </div>

      <TicketCard ticket={cardData} showSingleLink={false} />
    </main>
  );
}
