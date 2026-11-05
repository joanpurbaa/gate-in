# PROGRESS

Agent: centang `[x]` setelah tahap lulus `lint` + `build` + verifikasi di `docs/skills/self-verify.md`. Catat keputusan dan masalah terbuka di bawah.

## Tahap

- [ ] **0. Orientasi** — baca semua dokumen, rangkum pemahaman (tanpa kode)
- [ ] **1. Fondasi**: Prisma + Neon, skema, migrasi, seed dasar, `db.ts`, `.env.example`, nama env final
- [ ] **2. Generator layout + SeatMap**: grid & lingkaran, SVG pan/zoom, halaman `/dev/seatmap`, seed 2 layout
- [ ] **3. Alur pengunjung bagian 1**: beranda, detail event, data diri, denah pilih kursi, polling status
- [ ] **4. Locking kursi + pesanan**: hold atomik, timer, ringkasan, release, pesanan kedaluwarsa
- [ ] **5. Pembayaran simulasi + tiket**: bayar sukses/gagal, tiket + QR, halaman pesanan/tiket, kirim WhatsApp Fonnte (non-blocking)
- [ ] **6. Admin dasar**: login, dashboard, wizard buat event (template manual), zona & harga, publish
- [ ] **7. Check-in + monitoring**: scanner, 3 hasil, denah live hijau, statistik, peserta/transaksi, CSV
- [ ] **8. AI layout**: unggah foto + deskripsi → Gemini → preview → koreksi → simpan; fallback manual
- [ ] **9. Polish & rilis**: poster (Vercel Blob), state kosong/error, QA HP, README, jalankan DEMO_SCRIPT di Vercel

## Kontrak env final (isi oleh agent di Tahap 1)

_(nama variabel yang dipakai kode vs yang ada di Vercel)_

## Keputusan

_(catat keputusan default yang diambil agent)_

## Masalah Terbuka

_(blokir, bug yang diketahui, hal yang perlu dicek manual oleh manusia)_

## Saran (tidak dikerjakan)

_(ide di luar scope; jangan diimplementasikan)_