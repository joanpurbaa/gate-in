import { Calendar, Sparkles } from "lucide-react";
import { EventCard, type EventCardData } from "@/components/ui/EventCard";
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
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-[#3730A3]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Summarecon Mall Bandung • Pemilihan Kursi 1:1</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Pilih Kursi Anda dengan Pasti Sebelum Membeli Tiket
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-stone-600 sm:text-sm">
          Lihat denah ruangan sesuai susunan aslinya, pantau ketersediaan kursi secara langsung,
          dan terima e-ticket ber-QR code ke ponsel serta WhatsApp Anda.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 sm:text-lg">
            Acara Mendatang ({cards.length})
          </h2>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
            <Calendar className="mx-auto h-8 w-8 text-stone-400" />
            <h3 className="mt-3 text-sm font-bold text-stone-900">Belum Ada Acara Dipublikasikan</h3>
            <p className="mt-1 text-xs text-stone-600">
              Acara baru akan segera tampil di halaman ini setelah dipublikasikan oleh panitia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {cards.map((ev) => (
              <EventCard key={ev.slug} event={ev} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
