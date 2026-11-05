# PROGRESS

Agent: centang `[x]` setelah tahap lulus `lint` + `build` + verifikasi di `docs/skills/self-verify.md`. Catat keputusan dan masalah terbuka di bawah.

## Tahap

- [x] **0. Orientasi** — baca semua dokumen, rangkum pemahaman (tanpa kode)
- [x] **1. Fondasi**: Prisma + Neon, skema, migrasi, seed dasar, `db.ts`, `.env.example`, nama env final
- [x] **2. Generator layout + SeatMap**: grid & lingkaran, SVG pan/zoom, halaman `/dev/seatmap`, seed 2 layout
- [x] **3. Alur pengunjung bagian 1**: beranda, detail event, data diri, denah pilih kursi, polling status
- [x] **4. Locking kursi + pesanan**: hold atomik, timer, ringkasan, release, pesanan kedaluwarsa
- [ ] **5. Pembayaran simulasi + tiket**: bayar sukses/gagal, tiket + QR, halaman pesanan/tiket, kirim WhatsApp Fonnte (non-blocking)
- [ ] **6. Admin dasar**: login, dashboard, wizard buat event (template manual), zona & harga, publish
- [ ] **7. Check-in + monitoring**: scanner, 3 hasil, denah live hijau, statistik, peserta/transaksi, CSV
- [ ] **8. AI layout**: unggah foto + deskripsi → Gemini → preview → koreksi → simpan; fallback manual
- [ ] **9. Polish & rilis**: poster (Vercel Blob), state kosong/error, QA HP, README, jalankan DEMO_SCRIPT di Vercel

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

## Masalah Terbuka

- Pastikan `GEMINI_MODEL=gemini-2.5-flash` dan `AUTH_SECRET` ditambahkan di Environment Variables Vercel saat push.

## Saran (tidak dikerjakan)

- Pembersihan otomatis order `EXPIRED` lama lewat cron mingguan (tidak diperlukan untuk MVP karena status efektif dihitung saat query).
