import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Footer publik sesuai DESIGN_V2.md bagian 4:
 * - Logo, satu kalimat tentang GateIn
 * - Tautan Daftar acara dan Untuk penyelenggara
 * - Catatan "Pembayaran di prototipe ini disimulasikan"
 * - Satu baris kecil "Dibuat untuk Bandung Build Challenge 2026"
 * - Tanpa logo bank, e-wallet, atau toko aplikasi
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-card text-ink">
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="max-w-md space-y-2.5">
            <Logo size="md" />
            <p className="text-sm text-muted">
              Platform membeli tiket acara di kawasan Summarecon Mall Bandung dengan denah kursi yang
              sama seperti susunan ruangan aslinya
            </p>
          </div>

          <nav aria-label="Tautan kaki" className="flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-ink transition hover:text-gate">
              Daftar acara
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center">
          <p>Pembayaran di prototipe ini disimulasikan.</p>
          <p>Dibuat untuk Bandung Build Challenge 2026</p>
        </div>
      </div>
    </footer>
  );
}
