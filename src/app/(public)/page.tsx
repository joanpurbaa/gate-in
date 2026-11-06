import { Calendar } from "lucide-react";
import { EventCard, type EventCardData } from "@/components/ui/EventCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { computeSaleState } from "@/components/ui/StatusPill";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { startsAt: "asc" },
    include: {
      zones: { select: { price: true } },
      seats: {
        select: {
          status: true,
          heldUntil: true,
        },
      },
    },
  });

  const cards: EventCardData[] = events.map((ev) => {
    const totalSeats = ev.seats.length;
    const availableSeats = ev.seats.filter(
      (s) => s.status === "AVAILABLE" || (s.status === "HELD" && (!s.heldUntil || s.heldUntil <= now))
    ).length;

    const layoutObj = ev.layout as { generator?: { type?: "grid" | "circle" } } | null;
    const layoutType = layoutObj?.generator?.type ?? null;
    const prices = ev.zones.map((z) => z.price);

    return {
      slug: ev.slug,
      name: ev.name,
      description: ev.description,
      posterUrl: ev.posterUrl,
      venueName: ev.venueName,
      startsAt: ev.startsAt,
      prices,
      totalSeats,
      availableSeats,
      layoutType,
      saleState: computeSaleState({
        salesOpenAt: ev.salesOpenAt,
        salesCloseAt: ev.salesCloseAt,
        availableCount: availableSeats,
        now,
      }),
    };
  });

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:py-10">
      <section>
        <SectionHeader
          title="Sedang ramai di Bandung"
          subtitle="Pilih acara di Summarecon Mall Bandung dan tentukan kursimu langsung dari denah ruangan."
        />

        {cards.length === 0 ? (
          <div className="rounded-card border border-line bg-card p-10 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm font-medium text-ink">
              Belum ada acara yang cocok. Coba kata lain atau pilih Semua.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((ev) => (
              <EventCard key={ev.slug} event={ev} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
