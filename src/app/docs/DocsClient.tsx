"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Menu,
  X,
  Link as LinkIcon,
  Check,
  Compass,
  Building2,
  HelpCircle,
  QrCode,
  Ticket,
  Calendar,
  Layers,
  ShieldCheck,
  CreditCard,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { DocsNote } from "@/components/docs/DocsNote";
import { NumberedSteps } from "@/components/docs/NumberedSteps";
import { DocsImage } from "@/components/docs/DocsImage";

interface DocSectionItem {
  id: string;
  title: string;
  group: "pengunjung" | "penyelenggara";
  icon: React.ElementType;
}

const SECTIONS: DocSectionItem[] = [
  // Group Pengunjung
  { id: "pengunjung-mulai", title: "Mulai di Sini: Mengenal GateIn", group: "pengunjung", icon: Compass },
  { id: "pengunjung-cari", title: "Mencari & Memilih Acara", group: "pengunjung", icon: Search },
  { id: "pengunjung-detail", title: "Detail Acara & Status Penjualan", group: "pengunjung", icon: Calendar },
  { id: "pengunjung-denah", title: "Memilih Kursi & Denah Interaktif", group: "pengunjung", icon: Layers },
  { id: "pengunjung-checkout", title: "Data Pemesan & Tahan Kursi", group: "pengunjung", icon: ShieldCheck },
  { id: "pengunjung-bayar", title: "Pembayaran & Waktu 10 Menit", group: "pengunjung", icon: CreditCard },
  { id: "pengunjung-tiket", title: "Mendapat Tiket, QR & WhatsApp", group: "pengunjung", icon: Ticket },
  { id: "pengunjung-hari-h", title: "Saat Hari Acara & Pertanyaan Umum", group: "pengunjung", icon: HelpCircle },

  // Group Penyelenggara
  { id: "penyelenggara-login", title: "Masuk ke Panel Penyelenggara", group: "penyelenggara", icon: Building2 },
  { id: "penyelenggara-dashboard", title: "Dashboard & Ringkasan Penjualan", group: "penyelenggara", icon: Layers },
  { id: "penyelenggara-wizard-info", title: "Langkah 1: Info Dasar & Jadwal", group: "penyelenggara", icon: Calendar },
  { id: "penyelenggara-wizard-layout", title: "Langkah 2: Generator Denah Kursi", group: "penyelenggara", icon: Compass },
  { id: "penyelenggara-wizard-zona", title: "Langkah 3: Zona & Harga Tiket", group: "penyelenggara", icon: Ticket },
  { id: "penyelenggara-wizard-review", title: "Langkah 4: Review & Kunci Denah", group: "penyelenggara", icon: ShieldCheck },
  { id: "penyelenggara-monitor-live", title: "Memantau Penjualan & Denah Live", group: "penyelenggara", icon: Users },
  { id: "penyelenggara-checkin", title: "Operasional Check-in & Scanner Tiket", group: "penyelenggara", icon: QrCode },
  { id: "penyelenggara-data-faq", title: "Data Peserta, Unduh CSV & FAQ", group: "penyelenggara", icon: HelpCircle },
];

export function DocsClient() {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("pengunjung-mulai");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter bagian navigasi berdasarkan kata kunci
  const filteredSections = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.title.toLowerCase().includes(q));
  }, [filterQuery]);

  // Scroll spy menggunakan IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Ambil elemen paling atas yang terlihat
          const topVisible = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
          );
          setActiveSectionId(topVisible.target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    SECTIONS.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Salin anchor link ke clipboard
  const handleCopyAnchor = useCallback((id: string) => {
    const url = `${window.location.origin}/docs#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Navigasi halus dengan preferensi reduced motion
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const yOffset = -80;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({
      top: y,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-page text-ink selection:bg-gate/20">
      {/* 1. Header Bilah Atas Tipis */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group transition" title="Kembali ke Beranda">
            <Logo size="sm" />
          </Link>
          <span className="hidden h-4 w-px bg-line sm:inline-block" />
          <span className="hidden rounded-full bg-page px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line sm:inline-block">
            Dokumentasi & Panduan Aplikasi
          </span>
        </div>

        {/* Kanan: Badge noindex internal & Tombol Menu Mobile */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gate/10 px-2.5 py-1 text-[11px] font-bold text-gate">
            Panduan Resmi
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi dokumentasi"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-page text-muted hover:text-ink lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Container Layout 3 Kolom */}
      <div className="mx-auto flex max-w-[1440px] px-4 sm:px-6">
        {/* Kolom Kiri: Sidebar Navigasi Desktop */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line py-6 pr-4 lg:block">
          {/* Filter Pencarian Subjudul */}
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Saring judul bagian..."
              className="w-full rounded-input border border-line bg-card py-1.5 pl-8.5 pr-3 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <nav aria-label="Navigasi Dokumentasi" className="space-y-6 text-xs">
            {/* Grup Pengunjung */}
            <div>
              <div className="flex items-center gap-1.5 px-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted">
                <Compass className="h-3.5 w-3.5 text-gate" />
                <span>Untuk Pengunjung</span>
              </div>
              <ul className="mt-2 space-y-1">
                {filteredSections
                  .filter((s) => s.group === "pengunjung")
                  .map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    const Icon = sec.icon;
                    return (
                      <li key={sec.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(sec.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium transition ${
                            isActive
                              ? "bg-gate/10 font-bold text-gate"
                              : "text-muted hover:bg-page hover:text-ink"
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-gate" : "text-muted"}`} />
                          <span className="truncate">{sec.title}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Grup Penyelenggara */}
            <div>
              <div className="flex items-center gap-1.5 px-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted">
                <Building2 className="h-3.5 w-3.5 text-gate" />
                <span>Untuk Penyelenggara</span>
              </div>
              <ul className="mt-2 space-y-1">
                {filteredSections
                  .filter((s) => s.group === "penyelenggara")
                  .map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    const Icon = sec.icon;
                    return (
                      <li key={sec.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(sec.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium transition ${
                            isActive
                              ? "bg-gate/10 font-bold text-gate"
                              : "text-muted hover:bg-page hover:text-ink"
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-gate" : "text-muted"}`} />
                          <span className="truncate">{sec.title}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Kolom Tengah: Konten Dokumentasi (Maksimal ~720px) */}
        <main className="min-w-0 flex-1 px-0 py-8 lg:px-10">
          <div className="mx-auto max-w-[720px]">
            {/* Header Pengantar */}
            <div className="mb-10 pb-8 border-b border-line">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gate/10 px-3 py-1 font-mono text-xs font-bold text-gate">
                Panduan Komprehensif GateIn
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Panduan Penggunaan GateIn
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Pelajari langkah demi langkah cara mencari acara, memilih kursi interaktif 1:1, melakukan pemesanan, hingga operasional pemindaian check-in bagi penyelenggara acara di kawasan Bandung.
              </p>
            </div>

            {/* ================================================================= */}
            {/* BAGIAN I: UNTUK PENGUNJUNG                                        */}
            {/* ================================================================= */}
            <div className="space-y-16">
              {/* 1. Mulai di Sini */}
              <section id="pengunjung-mulai" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>1. Mulai di Sini: Mengenal GateIn</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-mulai")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-mulai" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    <strong>GateIn</strong> adalah platform <em>intelligent event ticketing</em> dan manajemen operasional venue yang menghadirkan pengalaman memilih kursi nyata 1:1. Anda tidak lagi membeli tiket secara acak atau menebak posisi tempat duduk Anda; denah yang tampil di layar merupakan proyeksi akurat dari ruangan acara sebenarnya di kawasan Summarecon Mall Bandung.
                  </p>

                  <NumberedSteps
                    steps={[
                      {
                        title: "Pilih Acara yang Menarik",
                        desc: "Temukan konser musik, summit teknologi, pentas wayang golek modern, atau workshop kreatif melalui katalog beranda.",
                      },
                      {
                        title: "Buka Denah & Pilih Kursi Idaman",
                        desc: "Ketuk nomor kursi pada denah visual untuk memeriksa zona kategori dan harga tiket resminya.",
                      },
                      {
                        title: "Kunci Kursi Secara Atomik",
                        desc: "Sistem menahan kursi pilihan Anda selama 10 menit dengan proteksi database transaksi agar tidak bisa direbut pembeli lain.",
                      },
                      {
                        title: "Bayar & Terima Tiket WhatsApp",
                        desc: "Selesaikan simulasi pembayaran, lalu tiket resmi ber-QR code otomatis dikirimkan ke nomor WhatsApp Anda.",
                      },
                    ]}
                  />

                  <DocsImage
                    src="/docs/pengunjung-01-beranda.webp"
                    alt="Tampilan beranda GateIn pada perangkat mobile 390px"
                    caption="Gambar 1: Beranda GateIn dengan carousel acara unggulan dan akses navigasi cepat."
                    priority={true}
                  />

                  <DocsNote type="tip">
                    GateIn berjalan optimal di semua peramban web modern tanpa perlu mengunduh aplikasi tambahan dari Play Store atau App Store.
                  </DocsNote>
                </div>
              </section>

              {/* 2. Mencari & Memilih Acara */}
              <section id="pengunjung-cari" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>2. Mencari & Memilih Acara</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-cari")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-cari" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Beranda GateIn menyediakan berbagai cara mudah untuk menemukan acara yang sesuai dengan minat dan jadwal Anda:
                  </p>

                  <ul className="list-disc space-y-2 pl-5 text-muted">
                    <li>
                      <strong className="text-ink">Pilah Berdasarkan Kategori:</strong> Ketuk ikon kategori di bawah banner utama untuk menyaring acara Musik, Teknologi, Seni & Budaya, Pendidikan, Komunitas, atau Olahraga.
                    </li>
                    <li>
                      <strong className="text-ink">Pencarian Cepat:</strong> Masukkan kata kunci nama acara, artis, nama tempat (venue), atau nama penyelenggara pada bilah pencarian header.
                    </li>
                    <li>
                      <strong className="text-ink">Koleksi Terkurasi:</strong> Telusuri baris acara <em>&ldquo;Sedang ramai di Bandung&rdquo;</em>, <em>&ldquo;Akhir pekan ini&rdquo;</em>, dan <em>&ldquo;Segera habis&rdquo;</em>.
                    </li>
                  </ul>

                  <DocsImage
                    src="/docs/pengunjung-02-kategori-pencarian.webp"
                    alt="Filter kategori dan hasil pencarian di beranda"
                    caption="Gambar 2: Menyaring acara berdasarkan kategori Musik dan pencarian kata kunci."
                  />
                </div>
              </section>

              {/* 3. Detail Acara & Status Penjualan */}
              <section id="pengunjung-detail" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>3. Detail Acara & Status Penjualan</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-detail")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-detail" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Saat membuka salah satu acara, halaman detail menampilkan informasi lengkap seperti poster resmi, waktu mulai acara, waktu pintu dibuka (<em>Gate Open</em>), lokasi tepat, serta rincian zona tiket.
                  </p>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="font-bold text-gate">Status: Segera Hadir</span>
                      <p className="mt-1 text-muted">Penjualan tiket belum dibuka sesuai jadwal panitia.</p>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="font-bold text-emerald-700">Status: Beli Tiket</span>
                      <p className="mt-1 text-muted">Tiket sedang dijual dan denah kursi siap dipilih.</p>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="font-bold text-rose-700">Status: Tiket Habis</span>
                      <p className="mt-1 text-muted">Seluruh kuota kursi telah terisi. Tombol Waiting List akan muncul.</p>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="font-bold text-muted">Status: Penjualan Ditutup</span>
                      <p className="mt-1 text-muted">Batas waktu pemesanan tiket resmi telah berakhir.</p>
                    </div>
                  </div>

                  <DocsImage
                    src="/docs/pengunjung-03-detail-acara.webp"
                    alt="Halaman detail acara Festival Kopi Priangan"
                    caption="Gambar 3: Halaman detail acara dengan rincian jadwal, venue, zona harga, dan tombol Pilih Kursi."
                  />
                </div>
              </section>

              {/* 4. Memilih Kursi di Denah */}
              <section id="pengunjung-denah" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>4. Memilih Kursi & Denah Interaktif</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-denah")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-denah" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Tekan tombol <strong>&ldquo;Pilih Kursi pada Denah&rdquo;</strong> untuk masuk ke kanvas interaktif SVG. Pada perangkat seluler, gunakan satu jari untuk menggeser denah atau cubit layar untuk memperbesar (zoom in) nomor bangku.
                  </p>

                  <div className="rounded-xl border border-line bg-page p-3.5 space-y-2">
                    <div className="font-bold text-ink">Kode Warna Status Kursi:</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full bg-gate" />
                        <span><strong>Tersedia:</strong> Warna zona (bisa diklik)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full bg-ink flex items-center justify-center text-[9px] text-white font-bold">✓</span>
                        <span><strong>Dipilih Saya:</strong> Hitam bercentang</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full bg-line" />
                        <span><strong>Tidak Tersedia:</strong> Terjual / Di-hold</span>
                      </div>
                    </div>
                  </div>

                  <DocsImage
                    src="/docs/pengunjung-04-denah-kursi.webp"
                    alt="Denah interaktif SVG dengan satu kursi terpilih"
                    caption="Gambar 4: Memilih kursi pada denah interaktif dengan rincian harga pada bar bawah."
                  />

                  <DocsNote type="tip">
                    Anda dapat memilih beberapa kursi sekaligus hingga batas maksimal yang ditentukan penyelenggara (umumnya 4 kursi per transaksi).
                  </DocsNote>
                </div>
              </section>

              {/* 5. Data Pemesan & Tahan Kursi */}
              <section id="pengunjung-checkout" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>5. Data Pemesan & Tahan Kursi (Hold)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-checkout")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-checkout" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Setelah menentukan kursi, ketuk tombol <strong>&ldquo;Lanjut ke checkout&rdquo;</strong> di bar bawah. Drawer formulir pemesanan akan terbuka di atas denah:
                  </p>

                  <NumberedSteps
                    steps={[
                      {
                        title: "Isi Nama Lengkap Peserta",
                        desc: "Masukkan nama asli sesuai kartu identitas (KTP/SIM/Kartu Pelajar) untuk verifikasi di pintu masuk.",
                      },
                      {
                        title: "Isi Nomor WhatsApp Aktif",
                        desc: "Gunakan format Indonesia (contoh: 081234567890). E-ticket resmi beserta tautan QR akan otomatis dikirimkan ke nomor ini.",
                      },
                      {
                        title: "Gunakan Kode Promo (Jika Ada)",
                        desc: "Masukkan kode voucher diskon dan ketuk 'Terapkan' untuk mendapatkan potongan harga seketika.",
                      },
                      {
                        title: "Konfirmasi & Kunci Kursi",
                        desc: "Ketuk tombol 'Konfirmasi & tahan kursi'. Sistem akan mengunci kursi di database server Neon secara atomik.",
                      },
                    ]}
                  />

                  <DocsImage
                    src="/docs/pengunjung-05-checkout-drawer.webp"
                    alt="Drawer checkout pengisian nama dan nomor WhatsApp"
                    caption="Gambar 5: Formulir checkout terintegrasi untuk memasukkan data pemesan dan voucher promo."
                  />

                  <DocsNote type="important" title="Jaminan Kursi Bebas Bentrok">
                    GateIn menggunakan database transaction dengan klausul <code>SELECT FOR UPDATE</code>. Jika ada pembeli lain yang menekan tombol pada milidetik yang sama untuk kursi yang sama, hanya satu orang yang berhasil, dan orang kedua akan diberitahu seketika untuk memilih kursi lain.
                  </DocsNote>
                </div>
              </section>

              {/* 6. Pembayaran & Timer 10 Menit */}
              <section id="pengunjung-bayar" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>6. Pembayaran & Waktu 10 Menit</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-bayar")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-bayar" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Setelah kursi berhasil ditahan, Anda akan dialihkan ke halaman pembayaran resmi. Bilah atas menampilkan <strong>timer hitung mundur 10 menit</strong> yang dihitung langsung dari jam server.
                  </p>

                  <DocsImage
                    src="/docs/pengunjung-06-pembayaran-timer.webp"
                    alt="Halaman pembayaran simulasi dengan timer hitung mundur 10 menit"
                    caption="Gambar 6: Halaman simulasi pembayaran dengan rincian total dan batas waktu reservasi."
                  />

                  <div className="rounded-xl border border-line bg-card p-3.5 space-y-2">
                    <div className="font-bold text-ink">Ketentuan Batas Waktu 10 Menit:</div>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted">
                      <li>Selama timer berjalan, nomor kursi tersebut tidak bisa diambil atau dilihat oleh pembeli lain di denah.</li>
                      <li>Di lingkungan prototipe ini, Anda cukup mengetuk tombol <strong>&ldquo;Bayar Sekarang (Simulasi)&rdquo;</strong> untuk menyelesaikan transaksi.</li>
                      <li>Bila waktu 10 menit habis sebelum pembayaran dikonfirmasi, sistem <em>Automatic Expired Order Recovery</em> akan secara otomatis membatalkan pesanan dan mengembalikan kursi ke denah agar pembeli lain dapat memesannya.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 7. Mendapat Tiket, QR & WhatsApp */}
              <section id="pengunjung-tiket" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>7. Mendapat Tiket, QR & WhatsApp</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-tiket")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-tiket" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Saat pembayaran dinyatakan lunas, halaman e-ticket resmi akan muncul dengan rincian lengkap pesanan:
                  </p>

                  <ul className="list-disc space-y-2 pl-5 text-muted">
                    <li>
                      <strong className="text-ink">Kode Tiket Alfanumerik:</strong> Kode unik 10 karakter (contoh: <code>DEMO000VLD</code>) untuk verifikasi cepat di gerbang.
                    </li>
                    <li>
                      <strong className="text-ink">QR Code Resolusi Tinggi:</strong> Barcode matriks yang langsung dipindai oleh pemindai petugas.
                    </li>
                    <li>
                      <strong className="text-ink">Notifikasi WhatsApp Otomatis:</strong> Server mengirim pesan WhatsApp konfirmasi pemesanan beserta tautan tiket digital Anda melalui Fonnte.
                    </li>
                    <li>
                      <strong className="text-ink">Unduh & Simpan:</strong> Gunakan tombol <em>&ldquo;Simpan Gambar Tiket&rdquo;</em> untuk menyimpan file gambar tiket ke galeri ponsel Anda.
                    </li>
                  </ul>

                  <DocsImage
                    src="/docs/pengunjung-07-tiket-qr.webp"
                    alt="Halaman konfirmasi e-ticket resmi dengan QR code dan kode tiket"
                    caption="Gambar 7: E-ticket resmi ber-QR code yang otomatis dikirimkan ke WhatsApp pemesan."
                  />
                </div>
              </section>

              {/* 8. Saat Hari Acara & FAQ */}
              <section id="pengunjung-hari-h" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h2 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>8. Saat Hari Acara & Pertanyaan Umum</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("pengunjung-hari-h")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "pengunjung-hari-h" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Pada hari pelaksanaan acara, siapkan QR Code tiket Anda (bisa lewat pesan WhatsApp atau membuka link <code>/tiket/[code]</code> di peramban HP Anda).
                  </p>

                  <DocsImage
                    src="/docs/pengunjung-08-hari-h-checkin.webp"
                    alt="Tampilan tiket mandiri di HP yang siap ditunjukkan ke petugas"
                    caption="Gambar 8: Tiket digital siap scan di pintu masuk acara."
                  />

                  <div className="mt-6 space-y-3">
                    <h3 className="font-display text-sm font-bold text-ink">Pertanyaan yang Sering Muncul (FAQ):</h3>
                    
                    <div className="rounded-xl border border-line bg-card p-3.5 space-y-1">
                      <div className="font-bold text-gate">Kursi tiba-tiba berubah warna saat saya memilih?</div>
                      <p className="text-muted">
                        Denah GateIn tersinkronisasi setiap 5 detik dengan server. Jika ada pembeli lain yang mengonfirmasi hold kursi tersebut lebih dahulu, denah akan langsung memperbarui statusnya. Silakan pilih nomor kursi lain yang masih tersedia.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-card p-3.5 space-y-1">
                      <div className="font-bold text-gate">Bagaimana jika pesan WhatsApp tidak masuk?</div>
                      <p className="text-muted">
                        Pengiriman WhatsApp bersifat non-blocking (tidak menggagalkan pembelian Anda). Anda tetap dapat mengakses tiket langsung lewat tautan konfirmasi pesanan di browser, atau membuka kode tiket di alamat <code>/pesanan/[orderId]</code>.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-card p-3.5 space-y-1">
                      <div className="font-bold text-gate">Salah memasukkan nomor WhatsApp saat checkout?</div>
                      <p className="text-muted">
                        Jangan khawatir! Simpan atau tangkap layar (screenshot) kode pesanan Anda saat halaman bayar atau tiket terbuka. Anda dapat menunjukkan halaman tersebut ke panitia di meja helpdesk pada hari acara.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ================================================================= */}
            {/* BAGIAN II: UNTUK PENYELENGGARA                                    */}
            {/* ================================================================= */}
            <div className="mt-20 pt-12 border-t-2 border-line space-y-16">
              <div className="pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white">
                  Modul Penyelenggara Acara (Organizer)
                </span>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                  Panduan Pengelolaan & Operasional Venue
                </h2>
                <p className="mt-2 text-xs text-muted">
                  Panduan lengkap masuk ke panel admin, pembuatan acara bertingkat, generator denah manual & AI Gemini, penguncian layout, hingga pemantauan kehadiran live.
                </p>
              </div>

              {/* 1. Masuk ke Panel */}
              <section id="penyelenggara-login" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>1. Masuk ke Panel Penyelenggara</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-login")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-login" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Akses panel penyelenggara dilakukan melalui rute khusus <code>/admin/login</code>. Masukkan alamat email akun panitia dan kata sandi yang telah didaftarkan.
                  </p>

                  <DocsImage
                    src="/docs/penyelenggara-01-login.webp"
                    alt="Halaman login panel penyelenggara GateIn"
                    caption="Gambar 9: Halaman masuk otentikasi resmi penyelenggara acara."
                  />

                  <DocsNote type="tip">
                    Untuk keperluan demo evaluasi juri, akun demo yang aktif adalah <code>panitia@demo.id</code> dengan kata sandi <code>demo1234</code>.
                  </DocsNote>
                </div>
              </section>

              {/* 2. Dashboard Penyelenggara */}
              <section id="penyelenggara-dashboard" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>2. Dashboard & Ringkasan Penjualan</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-dashboard")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-dashboard" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Setelah berhasil masuk, dashboard menampilkan 4 kartu metrik utama performa tiket:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="text-muted">Total Acara Aktif</span>
                      <div className="mt-1 font-display text-lg font-bold text-ink">8 Acara</div>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="text-muted">Tiket Terjual</span>
                      <div className="mt-1 font-display text-lg font-bold text-gate">412 Tiket</div>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="text-muted">Pendapatan Kotor</span>
                      <div className="mt-1 font-display text-lg font-bold text-ink">Rp37.825.000</div>
                    </div>
                    <div className="rounded-xl border border-line bg-card p-3">
                      <span className="text-muted">Keterisian Venue</span>
                      <div className="mt-1 font-display text-lg font-bold text-emerald-700">28.9%</div>
                    </div>
                  </div>

                  <DocsImage
                    src="/docs/penyelenggara-02-dashboard.webp"
                    alt="Dashboard penyelenggara dengan kartu statistik ringkasan"
                    caption="Gambar 10: Dashboard operasional penyelenggara dan daftar acara yang dikelola."
                  />
                </div>
              </section>

              {/* 3. Wizard Langkah 1: Info Dasar */}
              <section id="penyelenggara-wizard-info" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>3. Langkah 1: Info Dasar & Jadwal Acara</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-wizard-info")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-wizard-info" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Ketuk tombol <strong>&ldquo;Buat Acara Baru&rdquo;</strong> untuk membuka panduan wizard 4 langkah:
                  </p>

                  <ul className="list-disc space-y-2 pl-5 text-muted">
                    <li><strong className="text-ink">Informasi Umum:</strong> Nama Acara, Kategori (Musik, Tech, Arts, dll.), Nama Penyelenggara publik, dan Deskripsi lengkap acara.</li>
                    <li><strong className="text-ink">Venue & Lokasi:</strong> Nama gedung/ruangan dan alamat lengkap di kawasan Bandung.</li>
                    <li><strong className="text-ink">Jadwal Operasional (WIB):</strong> Waktu Acara Mulai, Waktu Pintu Dibuka (<em>Gate Open</em>), dan Waktu Pintu Ditutup (<em>Gate Close</em>).</li>
                    <li><strong className="text-ink">Periode Penjualan:</strong> Waktu Buka & Tutup penjualan tiket serta batas maksimal kursi per pesanan.</li>
                    <li><strong className="text-ink">Poster Acara:</strong> Unggah file poster gambar atau tempel tautan URL poster.</li>
                  </ul>

                  <DocsImage
                    src="/docs/penyelenggara-03-wizard-info.webp"
                    alt="Wizard langkah 1 informasi dasar dan jadwal acara"
                    caption="Gambar 11: Langkah 1 wizard pembuatan acara: konfigurasi jadwal dan detail tempat."
                  />
                </div>
              </section>

              {/* 4. Wizard Langkah 2: Layout Manual & AI */}
              <section id="penyelenggara-wizard-layout" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>4. Langkah 2: Generator Denah Kursi (Manual & AI)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-wizard-layout")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-wizard-layout" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    GateIn mendukung tiga metode pembuatan denah kursi SVG presisi:
                  </p>

                  <NumberedSteps
                    steps={[
                      {
                        title: "Template Kisi-Kisi (Grid)",
                        desc: "Cocok untuk auditorium, ruang kelas seminar, atau ballroom. Tentukan jumlah baris, kursi per baris, jarak antar kursi, dan posisi panggung.",
                      },
                      {
                        title: "Template Melingkar (Circle / Amfiteater)",
                        desc: "Cocok untuk arena melingkar, panggung 360 derajat, atau teater busur melengkung dengan sudut radial fleksibel.",
                      },
                      {
                        title: "Generator Cerdas AI Gemini",
                        desc: "Unggah foto sketsa denah di atas kertas atau denah arsitektur venue + deskripsikan orientasi panggung. AI Gemini memetakan koordinat X-Y dan nomor baris kursi secara otomatis.",
                      },
                    ]}
                  />

                  <DocsImage
                    src="/docs/penyelenggara-04-wizard-layout.webp"
                    alt="Wizard langkah 2 generator layout kursi dengan preview SVG"
                    caption="Gambar 12: Langkah 2 wizard: pratinjau interaktif denah kursi yang bisa diedit langsung."
                  />

                  <DocsNote type="tip">
                    Pada pratinjau denah, Anda dapat mengklik kursi tertentu untuk menghapus kursi rusak atau membuat lorong jalan. Kursi yang dihapus dapat dipulihkan kapan saja sebelum layout dikunci.
                  </DocsNote>
                </div>
              </section>

              {/* 5. Wizard Langkah 3: Zona & Harga */}
              <section id="penyelenggara-wizard-zona" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>5. Langkah 3: Zona & Harga Tiket</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-wizard-zona")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-wizard-zona" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Pada Langkah 3, atur kategori kelas tiket dan alokasi kursi:
                  </p>

                  <ul className="list-disc space-y-2 pl-5 text-muted">
                    <li><strong className="text-ink">Buat Kategori Zona:</strong> Tambahkan nama zona (misal: VIP, Regular Depan, Regular Belakang).</li>
                    <li><strong className="text-ink">Pilih Warna Penanda:</strong> Setiap zona memiliki warna khas yang membedakannya secara visual di denah.</li>
                    <li><strong className="text-ink">Tentukan Harga Resmi:</strong> Masukkan nominal harga tiket per kursi dalam mata uang Rupiah.</li>
                    <li><strong className="text-ink">Petakan Kursi ke Zona:</strong> Pilih baris atau klik kursi langsung pada denah untuk mengasosiasikannya dengan zona yang dipilih.</li>
                  </ul>

                  <DocsImage
                    src="/docs/penyelenggara-05-wizard-zona.webp"
                    alt="Wizard langkah 3 konfigurasi zona dan harga tiket"
                    caption="Gambar 13: Langkah 3 wizard: penetapan harga tiket dan klasifikasi zona kursi."
                  />
                </div>
              </section>

              {/* 6. Wizard Langkah 4: Review & Kunci Denah */}
              <section id="penyelenggara-wizard-review" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>6. Langkah 4: Review, Publikasi & Aturan Kunci Denah</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-wizard-review")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-wizard-review" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Langkah terakhir menampilkan rekapitulasi data acara: total kapasitas venue, ringkasan kuota per zona, dan estimasi potensi pendapatan kotor.
                  </p>

                  <DocsImage
                    src="/docs/penyelenggara-06-wizard-review.webp"
                    alt="Wizard langkah 4 review ringkasan acara dan opsi publish"
                    caption="Gambar 14: Langkah 4 wizard: tinjauan akhir sebelum acara diterbitkan ke publik."
                  />

                  <DocsNote type="important" title="Aturan Keras Kunci Denah (Layout Locked)">
                    Demi melindungi hak pembeli, begitu ada minimal 1 kursi yang berstatus <code>SOLD</code> (terjual) atau <code>HELD</code> (sedang dipesan), sistem akan <strong>mengunci denah kursi secara permanen</strong>. Koordinat, jumlah kursi, dan posisi panggung tidak dapat diubah lagi, namun Anda tetap dapat menyesuaikan harga zona untuk kursi yang masih tersedia.
                  </DocsNote>
                </div>
              </section>

              {/* 7. Monitor Penjualan & Denah Live */}
              <section id="penyelenggara-monitor-live" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>7. Memantau Penjualan & Denah Live</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-monitor-live")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-monitor-live" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Buka halaman monitor acara di <code>/admin/events/[id]</code> untuk melihat perkembangan tiket terjual dan kehadiran penonton secara langsung:
                  </p>

                  <DocsImage
                    src="/docs/penyelenggara-07-monitor-denah-live.webp"
                    alt="Halaman monitor acara dengan denah live kursi hijau yang sudah hadir"
                    caption="Gambar 15: Denah Live: Kursi yang pengunjungnya sudah check-in otomatis berubah menjadi hijau terang."
                  />

                  <div className="rounded-xl border border-line bg-card p-3.5 space-y-2">
                    <div className="font-bold text-ink">Keunggulan Denah Live:</div>
                    <p className="text-muted">
                      Setiap kali tiket dipindai di pintu masuk oleh petugas, denah monitor ini langsung menyalakan kursi bersangkutan dengan warna hijau terang (<code>#10B981</code>). Penyelenggara dapat langsung mengetahui baris mana yang sudah terisi dan baris mana yang penontonnya belum tiba.
                    </p>
                  </div>
                </div>
              </section>

              {/* 8. Check-in & Scanner Tiket */}
              <section id="penyelenggara-checkin" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>8. Operasional Check-in & Scanner Tiket</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-checkin")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-checkin" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Akses pemindai tiket berada di <code>/admin/events/[id]/checkin</code>. Pemindai memanfaatkan kamera ponsel atau tablet petugas secara langsung dari browser.
                  </p>

                  <DocsImage
                    src="/docs/penyelenggara-08-scanner-checkin.webp"
                    alt="Antarmuka scanner check-in dengan kamera dan input manual"
                    caption="Gambar 16: Pemindai QR code tiket dengan viewfinder kamera dan kolom input kode manual."
                  />

                  <p className="font-bold text-ink pt-2">Tiga Hasil Pemindaian Tiket GateIn:</p>

                  <div className="space-y-4">
                    <div>
                      <span className="font-bold text-emerald-700">A. Hasil VALID (Hijau):</span>
                      <p className="text-muted mt-0.5">
                        Tiket asli, belum pernah digunakan. Menampilkan nomor kursi, nama peserta, dan zona tiket. Status tiket diubah menjadi <code>USED</code>.
                      </p>
                      <DocsImage
                        src="/docs/penyelenggara-09-checkin-valid.webp"
                        alt="Hasil check-in tiket valid berwarna hijau"
                        caption="Gambar 17: Hasil pemindaian valid: tiket resmi disetujui untuk masuk."
                      />
                    </div>

                    <div>
                      <span className="font-bold text-amber-700">B. Hasil SUDAH DIGUNAKAN (Kuning/Amber):</span>
                      <p className="text-muted mt-0.5">
                        Peringatan keras jika ada upaya masuk ganda menggunakan tiket yang sama. Sistem menampilkan jam menit pemindaian pertama.
                      </p>
                      <DocsImage
                        src="/docs/penyelenggara-10-checkin-used.webp"
                        alt="Hasil check-in tiket sudah digunakan berwarna kuning"
                        caption="Gambar 18: Peringatan tiket ganda yang sudah dipindai sebelumnya."
                      />
                    </div>

                    <div>
                      <span className="font-bold text-rose-700">C. Hasil TIDAK VALID (Merah):</span>
                      <p className="text-muted mt-0.5">
                        Kode tiket palsu, tidak terdaftar di sistem, atau tiket milik acara lain yang berbeda.
                      </p>
                      <DocsImage
                        src="/docs/penyelenggara-11-checkin-invalid.webp"
                        alt="Hasil check-in tiket tidak valid berwarna merah"
                        caption="Gambar 19: Penolakan tiket tidak valid atau kode palsu."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 9. Data Peserta & FAQ */}
              <section id="penyelenggara-data-faq" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="group flex items-center gap-2 font-display text-xl font-bold text-ink sm:text-2xl">
                    <span>9. Data Peserta, Unduh CSV & FAQ</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAnchor("penyelenggara-data-faq")}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted hover:text-gate"
                      title="Salin tautan bagian ini"
                    >
                      {copiedId === "penyelenggara-data-faq" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-ink">
                  <p>
                    Pada tab <strong>&ldquo;Peserta & Transaksi&rdquo;</strong>, penyelenggara dapat melihat tabel data kehadiran seluruh penonton:
                  </p>

                  <DocsImage
                    src="/docs/penyelenggara-12-peserta-transaksi.webp"
                    alt="Tab daftar peserta dan tombol unduh CSV di panel monitor acara"
                    caption="Gambar 20: Rekapitulasi peserta dengan tombol unduh laporan spreadsheet CSV."
                  />

                  <div className="rounded-xl border border-line bg-card p-3.5 space-y-2">
                    <div className="font-bold text-ink">Ekspor Data CSV Aman:</div>
                    <p className="text-muted">
                      Ketuk tombol <strong>&ldquo;Unduh CSV&rdquo;</strong> untuk mengunduh laporan spreadsheet. Sistem secara otomatis menyaring dan menetralkan karakter berbahaya (formula injection) untuk menjamin keamanan file saat dibuka di Microsoft Excel atau Google Sheets.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h4 className="font-display text-sm font-bold text-ink">Pertanyaan Penyelenggara yang Sering Muncul (FAQ):</h4>
                    
                    <div className="rounded-xl border border-line bg-card p-3.5 space-y-1">
                      <div className="font-bold text-gate">Apakah tiket offline bisa dimasukkan secara manual?</div>
                      <p className="text-muted">
                        Ya. Petugas di gerbang cukup mengetikkan kode tiket di kolom input manual yang tersedia di bawah jendela kamera pemindai.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-card p-3.5 space-y-1">
                      <div className="font-bold text-gate">Bisakah membatalkan atau mengubah status tiket peserta?</div>
                      <p className="text-muted">
                        Demi audit keuangan, tiket yang sudah dibayar dan terbit tidak dapat diubah nomor kursinya secara sepihak agar integritas denah tetap konsisten.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Kolom Kanan: "Di halaman ini" Table of Contents Desktop */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto py-8 pl-4 xl:block">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Di Halaman Ini
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {SECTIONS.map((sec) => {
              const isActive = activeSectionId === sec.id;
              return (
                <li key={sec.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`block w-full truncate text-left py-1 transition ${
                      isActive
                        ? "font-bold text-gate border-l-2 border-gate pl-2.5"
                        : "text-muted hover:text-ink pl-3"
                    }`}
                  >
                    {sec.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* 3. Modal Drawer Menu Mobile (390px) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu Dokumentasi"
          className="fixed inset-0 z-50 flex bg-ink/60 backdrop-blur-xs lg:hidden"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="flex h-full w-[85%] max-w-xs flex-col border-r border-line bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-display text-sm font-bold text-ink">Daftar Isi Panduan</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-page hover:text-ink"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-6 text-xs">
              <div>
                <div className="font-display font-bold uppercase text-[11px] text-muted">Untuk Pengunjung</div>
                <ul className="mt-2 space-y-1">
                  {SECTIONS.filter((s) => s.group === "pengunjung").map((sec) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-left font-medium transition ${
                          activeSectionId === sec.id
                            ? "bg-gate/10 font-bold text-gate"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {sec.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-display font-bold uppercase text-[11px] text-muted">Untuk Penyelenggara</div>
                <ul className="mt-2 space-y-1">
                  {SECTIONS.filter((s) => s.group === "penyelenggara").map((sec) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-left font-medium transition ${
                          activeSectionId === sec.id
                            ? "bg-gate/10 font-bold text-gate"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {sec.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
