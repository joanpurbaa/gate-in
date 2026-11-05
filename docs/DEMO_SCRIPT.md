# DEMO_SCRIPT — Data Seed dan Skenario Demo

Seed harus idempotent: menjalankan ulang mereset data demo ke kondisi awal (hapus order/ticket demo, kembalikan kursi, buat ulang kode demo).

## 1. Data Seed

**Akun penyelenggara**
- Email `panitia@demo.id`, kata sandi `demo1234` (hash bcrypt di database)
- Boleh satu akun kedua `panitia2@demo.id` dengan event kosong untuk demo wizard

**Event 1 — Bandung Tech Summit 2026** (published, layout grid)
- Tempat: ruang acara fiktif, Summarecon Mall Bandung
- Grid 15 baris × 20 kolom = 300 kursi, lorong setelah kolom 10, panggung di atas
- Zona: **VIP** baris A–C Rp150.000 (60 kursi), **Reguler** baris D–O Rp75.000 (240 kursi)
- Penjualan: dibuka sejak kemarin, tutup 3 hari sebelum acara (selalu valid terhadap tanggal saat seed dijalankan; hitung relatif terhadap `now`)
- Sebagian kursi sudah **SOLD** (± 40, tersebar, termasuk beberapa di VIP) agar denah terlihat hidup
- 1 kursi **HELD** dengan hold yang masih berlaku (untuk memperlihatkan amber)

**Event 2 — Malam Akustik Melingkar** (published, layout lingkaran)
- Panggung di tengah, 3 ring (24 + 32 + 40 = 96 kursi), 2 lorong
- Ring 1 VIP Rp150.000; Ring 2–3 Reguler Rp100.000
- Beberapa kursi SOLD

**Event 3 — Draft Demo** (status draft, tanpa layout) untuk demo wizard (opsional)

**Tiket demo (kode tetap, agar demo tidak bergantung pada pembelian baru)**
- `DEMO000VLD` → status VALID, event 1, kursi `C-8`, atas nama "Budi Demo"
- `DEMO000USD` → status USED (sudah check-in), event 1, kursi `C-9`
- Kode acak seperti `ZZZZ999999` → tidak ada → TIDAK VALID
- Buat gambar QR dari `DEMO000VLD` dan `DEMO000USD` (halaman `/tiket/DEMO000VLD`) agar bisa discan dari layar laptop

## 2. Skenario Demo (urut)

1. **Beranda & detail event** di HP: poster, jadwal, harga, status penjualan
2. **Beli tiket**: isi nama dan nomor WA → denah: legenda, zoom, kursi VIP/Reguler, kursi terjual dan ditahan jelas
3. **Rebutan kursi** (dua tab/perangkat): A memilih kursi `E-5` → Lanjut (ditahan, timer jalan). B memilih `E-5` lalu Lanjut → B menerima "Kursi baru saja diambil" dan denahnya menampilkan `E-5` amber
4. **Kedaluwarsa/gagal bayar**: A menekan "Simulasikan gagal" → kursi kembali tersedia di tab B setelah polling
5. **Bayar sukses**: B memilih kursi lain → Ringkasan → Simulasikan berhasil → halaman pesanan: QR, kode, event, kursi (+ WhatsApp terkirim bila Fonnte aktif)
6. **Admin**: login → dashboard angka naik → denah live menunjukkan kursi baru terjual
7. **Check-in 3 hasil**: scan `DEMO000VLD` → VALID (kursi `C-8` hijau di denah admin); scan lagi → SUDAH DIGUNAKAN (tampil jam); scan `ZZZZ999999` → TIDAK VALID
8. **Layout dengan AI**: wizard event baru → unggah foto ruangan + deskripsi → preview → koreksi satu kursi → zona & harga → publish
9. **Data**: tab peserta & transaksi → Unduh CSV
10. **Event melingkar**: tunjukkan layout lingkaran (bukti layout mengikuti bentuk asli)

## 3. Persiapan Hari H

- Bangunkan database Neon beberapa menit sebelum (akses halaman beranda dan satu API)
- Uji di Vercel (bukan hanya lokal), di HP sungguhan, pada jaringan mal
- Kamera: pastikan izin kamera untuk situs sudah diberikan
- Cadangkan: foto layout contoh + deskripsi siap pakai; template manual bila AI lambat
- Reset seed sebelum setiap sesi demo
- Pastikan link prototype dapat dibuka tanpa login oleh juri (halaman publik) dan beri kredensial penyelenggara di deck