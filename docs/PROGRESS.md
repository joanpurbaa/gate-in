# PROGRESS

Agent: centang `[x]` setelah tahap lulus `lint` + `build` + verifikasi di `docs/skills/self-verify.md`. Catat keputusan dan masalah terbuka di bawah.

## Tahap

- [x] **0. Orientasi** — baca semua dokumen, rangkum pemahaman (tanpa kode)
- [x] **1. Fondasi**: Prisma + Neon, skema, migrasi, seed dasar, `db.ts`, `.env.example`, nama env final
- [x] **2. Generator layout + SeatMap**: grid & lingkaran, SVG pan/zoom, halaman `/dev/seatmap`, seed 2 layout
- [x] **3. Alur pengunjung bagian 1**: beranda, detail event, data diri, denah pilih kursi, polling status
- [x] **4. Locking kursi + pesanan**: hold atomik, timer, ringkasan, release, pesanan kedaluwarsa
- [x] **5. Pembayaran simulasi + tiket**: bayar sukses/gagal, tiket + QR, halaman pesanan/tiket, kirim WhatsApp Fonnte (non-blocking)
- [x] **6. Admin dasar**: login, dashboard, wizard buat event (template manual), zona & harga, publish
- [x] **7. Check-in + monitoring**: scanner, 3 hasil, denah live hijau, statistik, peserta/transaksi, CSV
- [x] **8. AI layout**: unggah foto + deskripsi → Gemini → preview → koreksi → simpan; fallback manual
- [x] **9. Polish & rilis**: poster (Vercel Blob), state kosong/error, QA HP, README, jalankan DEMO_SCRIPT di Vercel
- [x] **10. Fondasi visual**: token warna dan tipografi, logo, header dan footer, PosterImage dan PosterFallback, perbaikan legenda dan cincin kursi
- [x] **11. Beranda marketplace + data realistis**: kategori, isFeatured, organizerName, seed 8 acara, hero carousel, kategori, pencarian, baris acara, kartu karcis, band penjelas dan penyelenggara
- [ ] **12. Detail acara, alur beli, tiket**: tampilan baru tanpa mengubah logika
- [ ] **13. Admin dan QA visual**: branding admin, thumbnail poster, wizard kategori dan poster, QA 390px dan 1440px, tangkapan layar sebelum dan sesudah

## Kontrak env final (isi oleh agent di Tahap 1)

| Variabel di kode | Status di `.env` / Vercel | Catatan |
|---|---|---|
| `DATABASE_URL` | Ada (pooled Neon) | Dipakai runtime oleh `@prisma/adapter-neon` di `src/lib/db.ts` |
| `DIRECT_URL` / `DATABASE_URL_UNPOOLED` | `DATABASE_URL_UNPOOLED` ada | `prisma.config.ts` otomatis membaca `DIRECT_URL ?? DATABASE_URL_UNPOOLED ?? DATABASE_URL` sehingga cocok dengan variabel bawaan integrasi Neon Vercel tanpa perlu ubah env |
| `FONNTE_TOKEN` | Ada | Dipakai `src/lib/wa.ts` (Tahap 5) |
| `GEMINI_API_KEY` | Ada | Dipakai `@google/genai` (Tahap 8) |
| `GEMINI_MODEL` | Ditambahkan di `.env` (`gemini-2.5-flash`) | Perlu ditambahkan di Vercel sebelum Tahap 8 (`GEMINI_MODEL=gemini-2.5-flash`); kode memakai fallback `gemini-2.5-flash` bila env belum diset |
| `AUTH_SECRET` | Ditambahkan di `.env` | Disarankan ditambahkan di Vercel; kode memakai fallback turunan `DATABASE_URL` bila belum diset agar login admin tetap jalan |
| `BLOB_READ_WRITE_TOKEN` | Opsional (Tahap 9) | Bila belum ada di Vercel, unggah poster memberi pesan ramah dan mengizinkan URL/placeholder |
| `NEXT_PUBLIC_APP_URL` | Opsional | Fallback ke `VERCEL_PROJECT_PRODUCTION_URL` atau origin request |

## Keputusan

- **Eksekusi nonstop Tahap 1→9**: atas instruksi eksplisit user, seluruh tahap dikerjakan berurutan dengan commit lokal per tahap (`tahap-N: ...`).
- **Prisma 7.10.1 stabil**: `npm install prisma` tanpa versi menarik `8.0.0-rc.30`; dikunci ke `7.10.1` agar selaras dengan `@prisma/client@7.10.1` dan `@prisma/adapter-neon@7.10.1`.
- **Next.js 16 `cacheComponents`**: dimatikan di `next.config.ts` karena aplikasi ticketing membutuhkan pembacaan status kursi dan pesanan yang selalu segar per request.
- **Schema `neon_auth` bawaan Neon**: dibiarkan tidak tersentuh; semua tabel aplikasi berada di schema `public`.
- **Atomic Seat Locking (`src/lib/seats.ts`)**: menggunakan satu statement CTE `SELECT ... ORDER BY "id" FOR UPDATE` + `UPDATE "Seat"` untuk mencegah race condition sekaligus mencegah deadlock pada pemilihan multi-kursi. Diuji dengan 8 request paralel di `scripts/test-locking.ts`.
- **AI Layout Fallback Kuota Free Tier (`src/lib/ai/layout.ts`)**: membaca `GEMINI_MODEL` dari env (`gemini-2.5-flash`) dan bila terkena limit RPM free tier (`429 RESOURCE_EXHAUSTED`), otomatis melakukan retry 1x ke `gemini-2.5-flash-lite` agar demo tidak gagal. Diuji pada 5 skenario di `scripts/test-ai-layout.ts`.
- **Tahap 11 (Beranda Marketplace & Data Realistis)**:
  - Skema database: migrasi `20261106091032_add_event_category_and_featured` sukses menambahkan `EventCategory` (MUSIC, TECH, ARTS, EDUCATION, COMMUNITY, SPORTS), kolom `category` (default `COMMUNITY`), `isFeatured` (default `false`), dan `organizerName` (opsional).
  - Seed 8 acara realistis Summarecon Mall Bandung sukses dijalankan idempotent dengan waktu bulat WIB wajar (09.00, 10.00, 13.00, 15.00, 16.00, 19.00, 19.30 WIB). Seluruh kursi SOLD memiliki pesanan PAID dan tiket VALID/USED. Tiket demo `DEMO000VLD` (C-8), `DEMO000USD` (C-9), dan kursi uji balapan `E-5`, `E-6`, `E-7` tetap utuh.
  - Performa agregasi kursi: dihitung dengan satu kueri agregasi SQL berkelompok (`GROUP BY "eventId"`), menggantikan pengambilan ratusan objek kursi ke memori.
  - UI Beranda Marketplace:
    - `HeroCarousel`: scroll-snap CSS tanpa library luar, 16:7 desktop dengan 8% peek tetangga, 4:5 swipe di mobile, auto-advance 6 detik dengan pause hover/touch.
    - `CategoryBar`: 6 ikon kategori SVG bulat 64px di latar Gerbang 8% dengan state sinkron ke URL `?kategori=`.
    - Pencarian klien: terhubung dengan search input header pil, mencari berdasarkan nama acara, tempat, dan penyelenggara dengan state kosong yang ramah.
    - 3 Baris Acara Data Nyata: "Sedang ramai di Bandung", "Akhir pekan ini", dan "Segera habis" (sisa < 25%). Baris disembunyikan otomatis jika acara yang memenuhi syarat < 3.
    - `EventCard`: format karcis dengan lencana tanggal besar, pil kategori, penyelenggara, venue, harga mulai dari, dan takik setengah lingkaran bergaris putus-putus.
    - `ExplainerBand`: band denah nyata 1:1 "Lihat kursimu sebelum bayar" dengan SeatMap mode view dari acara unggulan.
    - `OrganizerBand`: band ajakan penyelenggara berlatar Tinta.
  - Wizard Admin: langkah 1 dilengkapi pilihan Kategori, isian Nama Penyelenggara publik, dan validasi nama acara wajib diisi.
  - Tangkapan layar tersimpan di `docs/screenshots/after-11/` (scrollWidth 390px dan 1440px tanpa overflow horizontal).
  - Status berkas poster: direktori `public/posters/` belum ada berkas asli, sehingga seluruh 8 acara secara mulus menggunakan `PosterFallback`.
- **Tahap 10 (Fondasi Visual)**:
  - Token warna, tiered radius (`20px` kartu, `14px` tombol, `12px` input), dan skala tipografi (12–56px) diterapkan di `src/app/globals.css` dan diekspos ke TS di `src/lib/design-tokens.ts`. Semua token indigo lama digantikan Gerbang (`#E14D2A`), Batu (`#1C1917`), Tinta (`#0F172A`), dll.
  - Font Bricolage Grotesque (700, 800) dan Figtree (400, 500, 600) dimuat via `next/font/google`.
  - Aset brand mandiri dibuat di `public/brand/` (`gatein-mark.svg`, `gatein-mark-reversed.svg`, `gatein-mark-mono.svg`, `favicon.svg`), komponen `Logo` menggabungkan mark + teks "GateIn".
  - Dynamic `apple-icon.tsx` (180x180) dan `opengraph-image.tsx` (1200x630) menggunakan `ImageResponse`.
  - Header publik baru dengan search bar pil (overlay full-screen di 390px), chip "Bandung, Summarecon", dan tombol "Untuk penyelenggara".
  - Komponen dasar baru: `Button`, `Chip`, `Badge`, `SectionHeader`, `Skeleton`, `PosterFallback`, `PosterImage`, `PublicFooter`. Halaman playground dev `/dev/poster` aktif untuk menguji 10 variasi fallback.
  - Denah kursi: legenda "Tersedia (warna sesuai zona)" berbingkai tegas; seleksi "Dipilih saya" memakai warna Tinta dan ikon centang.
  - Build produksi distandarkan menggunakan `next build --webpack` untuk memastikan keandalan kompilasi.
  - Tangkapan layar tersimpan di `docs/screenshots/before/` dan `docs/screenshots/after-10/`.
- **Uji Kirim WhatsApp Fonnte**: telah diuji langsung ke nomor `082275338090` (`6282275338090`) dengan hasil `{ status: 'SENT' }` dan kode tiket `YM6D542KNM` (kursi `A-10` VIP) yang tetap aktif (`VALID`) di database bersama tiket seed `DEMO000VLD` (`VALID`) dan `DEMO000USD` (`USED`).

## Masalah Terbuka

- Pastikan `GEMINI_MODEL=gemini-2.5-flash` dan `AUTH_SECRET` ditambahkan di Environment Variables Vercel saat push.

## Saran (tidak dikerjakan)

- Pembersihan otomatis order `EXPIRED` lama lewat cron mingguan (tidak diperlukan untuk MVP karena status efektif dihitung saat query).
