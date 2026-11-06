import { notFound } from "next/navigation";
import { PosterFallback } from "@/components/ui/PosterFallback";
import { PosterImage } from "@/components/ui/PosterImage";
import { SectionHeader } from "@/components/ui/SectionHeader";

const SAMPLE_EVENTS = [
  {
    slug: "bandung-tech-summit-2026",
    name: "Bandung Tech Summit 2026",
  },
  {
    slug: "malam-akustik-melingkar",
    name: "Malam Akustik Melingkar",
  },
  {
    slug: "ketawa-kota-kembang",
    name: "Ketawa Kota Kembang: Malam Stand-up",
  },
  {
    slug: "simfoni-kota-orkestra-muda",
    name: "Simfoni Kota: Orkestra Muda Bandung",
  },
  {
    slug: "pentas-wayang-golek-reimagined",
    name: "Pentas Wayang Golek Reimagined",
  },
  {
    slug: "workshop-fotografi-jalanan",
    name: "Workshop Fotografi Jalanan Bandung",
  },
  {
    slug: "career-talk-jalur-kerja-2027",
    name: "Career Talk: Jalur Kerja 2027",
  },
  {
    slug: "festival-kopi-priangan-cupping",
    name: "Festival Kopi Priangan: Sesi Cupping",
  },
  {
    slug: "diskusi-buku-senja-sawarga",
    name: "Diskusi Buku Senja di Sawarga",
  },
  {
    slug: "turnamen-catur-cepat-gedebage",
    name: "Turnamen Catur Cepat Gedebage",
  },
];

export default function DevPosterPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeader
        title="Pratinjau Poster Generatif"
        subtitle="Sepuluh nama acara berbeda untuk menguji variasi deterministik PosterFallback dan penanganan onError PosterImage."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_EVENTS.map((ev, idx) => (
          <div
            key={ev.slug}
            className="overflow-hidden rounded-card border border-line bg-card"
          >
            {idx === 0 ? (
              <PosterImage
                src="/posters/berkas-tidak-ada-untuk-uji-fallback.webp"
                alt={ev.name}
                slug={ev.slug}
              />
            ) : (
              <PosterFallback name={ev.name} slug={ev.slug} />
            )}
            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
              <span className="truncate font-medium text-ink">{ev.slug}</span>
              <span>16:9</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
