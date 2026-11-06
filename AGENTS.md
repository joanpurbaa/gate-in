# AGENTS.md — Aturan Kerja Agent

Proyek: **Platform Event Ticketing dengan Pemilihan Kursi** untuk Bandung Build Challenge 2026.
Ini prototype untuk lomba, bukan produk produksi. Prioritas: alur inti jalan mulus, kursi jelas, demo tidak gagal.

## 0. Wajib dibaca sebelum menulis kode (urut)

1. `docs/PRD.md` — apa yang dibangun, peran, alur, scope
2. `docs/DATA_MODEL.md` — tabel, status, aturan locking kursi
3. `docs/SEAT_LAYOUT_SPEC.md` — format layout, generator, AI layout
4. `docs/DESIGN.md` — gaya UI, warna status kursi, daftar halaman
5. `docs/DESIGN_V2.md` — arah visual, menimpa bagian gaya di DESIGN.md, dan `docs/ASSETS.md`
6. `docs/PROGRESS.md` — checklist tahap; update setiap selesai
7. `docs/DEMO_SCRIPT.md` — data seed dan skenario demo yang harus lolos
8. `docs/skills/frontend-ui.md` dan `docs/skills/self-verify.md`

Dokumen adalah sumber kebenaran. Kalau prompt bertentangan dengan dokumen, **berhenti dan tanya**, jangan memilih sendiri.

## 1. Stack (dikunci)

- Next.js (App Router) + TypeScript strict
- Tailwind CSS
- Neon Postgres + **Prisma** (pakai adapter serverless Neon; `DATABASE_URL` pooled untuk runtime, `DIRECT_URL` untuk migrasi bila perlu)
- Fonnte untuk kirim WhatsApp (via fetch ke API Fonnte)
- Google Gemini via SDK resmi Google GenAI, hanya untuk AI layout
- Vercel Blob untuk gambar (poster), dikerjakan di tahap akhir
- Hosting Vercel free tier

**Cek dokumentasi resmi / Context7 untuk versi Next.js, Prisma, dan SDK Gemini yang terpasang. Jangan mengandalkan ingatan; API-nya sering berubah.**

### Library yang diizinkan

`prisma`, `@prisma/client`, adapter Neon untuk Prisma, `@neondatabase/serverless`, `zod`, `bcryptjs`, `jose`, `qrcode`, satu library scanner QR berbasis kamera browser (contoh `html5-qrcode`), SDK Google GenAI, `@vercel/blob`, `lucide-react`, `clsx`.
Library lain: **sebutkan alasannya dan minta izin dulu**.
Catatan: Tahap 10 sampai 13 tidak menambah library. Carousel dibuat dengan CSS scroll-snap dan sedikit kode sendiri.

### Environment variable

Nama yang dipakai kode (cocokkan dengan yang sudah ada di Vercel, kalau beda **ubah kode, jangan minta saya ubah env**; laporkan nama final di `PROGRESS.md`):

`DATABASE_URL`, `DIRECT_URL` (opsional), `GEMINI_API_KEY`, `GEMINI_MODEL` (nama model dibaca dari env, jangan di-hardcode), `FONNTE_TOKEN`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` (nanti), `NEXT_PUBLIC_APP_URL`.
Buat `.env.example` tanpa nilai asli. Jangan pernah commit `.env*` yang berisi nilai.

## 2. Struktur folder

```
src/
  app/
    (public)/            # halaman pengunjung
    admin/               # halaman penyelenggara
    api/                 # route handlers
  components/
    seatmap/             # SeatMap SVG, legenda, tooltip
    ui/                  # komponen dasar
  lib/
    db.ts                # prisma client
    auth.ts              # sesi penyelenggara
    seats.ts             # SATU-SATUNYA tempat mengubah status kursi
    layout/              # types, grid.ts, circle.ts, generate.ts, validate.ts
    ai/layout.ts         # panggilan Gemini + validasi output
    wa.ts                # kirim tiket via Fonnte
    qr.ts                # generate QR, kode tiket
    money.ts, time.ts    # format Rupiah, zona waktu WIB
prisma/
  schema.prisma
  seed.ts
docs/
```

## 3. Aturan keras

1. **Status kursi hanya boleh diubah lewat fungsi di `src/lib/seats.ts`** (hold, release, confirm sold). Tidak ada update status kursi di tempat lain.
2. **Harga dan total dihitung di server** dari database. Jangan percaya angka dari klien.
3. Setiap route admin wajib cek sesi **dan** kepemilikan event (`event.organizerId`).
4. Validasi semua input dengan `zod` di sisi server.
5. **Dilarang menulis file ke disk saat runtime** (Vercel read-only). Gambar → Vercel Blob atau langsung ke Gemini tanpa disimpan.
6. Tidak ada payment gateway asli. Pembayaran = simulasi (lihat PRD).
7. Gagal kirim WhatsApp **tidak boleh** menggagalkan pesanan. Catat error, tampilkan tiket di web tetap.
8. Waktu disimpan UTC, ditampilkan WIB (Asia/Jakarta).
9. Jangan menambah fitur di luar scope PRD. Ide tambahan → tulis di bagian "Saran" di `PROGRESS.md`, jangan dikerjakan.
10. UI berbahasa Indonesia; nama variabel, fungsi, tabel dalam bahasa Inggris.
11. Data demo saja. Tidak ada data pribadi atau kartu asli.
12. Tahap 10 sampai 13 hanya mengubah tampilan dan data tampilan. Dilarang mengubah `src/lib/seats.ts`, logika hold/pay/check-in, dan route API yang sudah ada, kecuali penambahan field kategori seperti tertulis di `DESIGN_V2.md` bagian 10. Setelah setiap tahap, skenario `DEMO_SCRIPT.md` dan skrip uji balapan harus tetap lolos.

## 4. Cara kerja per tahap

- Kerjakan **satu tahap per prompt**. Jangan lompat ke tahap berikutnya.
- Sebelum menulis kode: ringkas rencana singkat (file yang akan dibuat/diubah).
- Setelah selesai: jalankan `npm run lint` dan `npm run build` sampai bersih, ikuti `docs/skills/self-verify.md`.
- Update `docs/PROGRESS.md` (centang, catat keputusan, catat masalah terbuka).
- Commit lokal dengan format: `tahap-N: ringkasan singkat`. **Jangan push**; saya yang push ke GitHub.
- Akhiri dengan laporan pendek: apa yang jadi, apa yang saya perlu cek manual, apa yang belum.
- Kalau ada hal yang ambigu dan menentukan arah, tanya. Kalau sepele, pilih default yang masuk akal dan catat di `PROGRESS.md`.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
