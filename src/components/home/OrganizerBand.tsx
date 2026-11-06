import React from "react";
import Link from "next/link";

export function OrganizerBand() {
  return (
    <section
      aria-label="Untuk penyelenggara"
      className="my-10 overflow-hidden rounded-[20px] border border-line bg-ink px-6 py-8 text-white sm:px-10 sm:py-12"
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          {/* <div className="flex items-center gap-2 text-ticket">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Untuk Penyelenggara
            </span>
          </div> */}

          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Punya acara? Foto ruangannya, denah kursinya jadi otomatis.
          </h2>

          <p className="mt-2 text-sm text-sand/80 sm:text-base">
            Unggah foto tata letak kursi atau panggung mal, asisten AI kami akan
            menerjemahkannya menjadi denah interaktif 1:1 siap jual dalam hitungan menit.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex min-h-12 flex-none items-center justify-center rounded-button bg-ticket px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-[#c2ed2c] focus-visible:ring-2 focus-visible:ring-ticket"
        >
          Buat acara
        </Link>
      </div>
    </section>
  );
}
