# GateIn — Platform Event Ticketing dengan Pemilihan Kursi 1:1

Prototype **Platform Event Ticketing dengan Pemilihan Kursi** untuk **Bandung Build Challenge 2026** (Summarecon Mall Bandung).

GateIn memudahkan **penyelenggara acara** memetakan tata letak kursi ruangan secara akurat (melalui generator template atau **AI Layout berbasis Google Gemini Vision**) serta memantau kehadiran dan check-in QR secara real-time, sekaligus memberikan pengalaman **pengunjung** yang cepat (tanpa wajib membuat akun) untuk memilih kursi dari denah SVG interaktif 1:1, membayar (simulasi), dan menerima e-ticket ber-QR code langsung di web dan WhatsApp.

---

## Fitur Utama

### Sisi Pengunjung (Mobile-First, Tanpa Login)
1. **Jelajah & Detail Acara**: Informasi waktu, venue, jam *open gate*, serta kuota kursi per kategori harga secara real-time.
2. **Denah Kursi SVG Interaktif 1:1**:
   - Mendukung tata letak **Grid Persegi** (dengan lorong baris/kolom) dan **Melingkar / Huruf O** (panggung di tengah).
   - Pan, pinch-zoom, tombol `+/-`, dan tombol *Reset Tampilan*.
   - Legenda warna & bentuk/ikon status kursi yang ramah buta warna:
     - **Tersedia**: Warna zona (Emas VIP / Teal Reguler / Indigo Balkon)
     - **Dipilih**: Hijau tua dengan ikon centang (`✓`)
     - **Dipesan Sementara (Hold)**: Kuning amber dengan pola garis miring
     - **Terjual**: Abu-abu dengan tanda silang (`×`)
3. **Locking Kursi Atomik & Countdown 10 Menit**:
   - Maksimal 4 kursi per transaksi.
   - Begitu diklik *Lanjut ke Pembayaran*, kursi dikunci selama 10 menit dengan timer hitung mundur.
4. **Simulasi Pembayaran & E-Ticket Instan**:
   - Panel simulasi **Bayar Sekarang (Sukses)**, **Simulasikan Gagal / Batal**, dan **Lepas Kursi & Pilih Ulang**.
   - Terbit kode tiket unik 10 karakter + QR code (dapat diunduh sebagai PNG) serta pengiriman otomatis ke WhatsApp melalui **Fonnte** (non-blocking).

### Sisi Penyelenggara (Panel Admin)
1. **Wizard Buat & Edit Acara (3 Langkah)**:
   - **Langkah 1**: Informasi acara, lokasi, waktu mulai/selesai, jam *open gate*, batas akhir penjualan, dan unggah poster (**Vercel Blob** atau URL eksternal).
   - **Langkah 2**: Pemetaan denah kursi dengan 2 mode:
     - **Bantuan AI (Foto + Deskripsi)**: Unggah foto ruangan dan/atau tulis deskripsi teks → dianalisis oleh **Google Gemini** menjadi parameter terstruktur (`grid` / `circle` / `unsupported`) beserta peringatan (`warnings`) & pertanyaan klarifikasi (`questions`) → pratinjau interaktif → koreksi parameter/klik bangku untuk hapus atau pulihkan sebelum disimpan.
     - **Template Manual**: Atur baris, kolom, lorong, atau ring melingkar secara langsung.
   - **Langkah 3**: Atur kategori tiket (zona, warna, harga) dan tetapkan baris/ring ke masing-masing zona, lalu simpan sebagai **Draf** atau **Publikasikan**.
2. **Monitoring Real-Time & Ekspor CSV**:
   - Denah kursi live (polling setiap 4 detik) dengan kursi peserta yang sudah hadir berubah menjadi **Hijau Terang (`✓`)**.
   - 4 Kartu Statistik: **Kapasitas Total**, **Terjual**, **Hadir (Check-in)**, dan **Pendapatan**.
   - Tabel Peserta, Tabel Transaksi, dan tombol **Unduh CSV** dengan proteksi *CSV Formula Injection*.
3. **Scanner Check-in QR Code (Kamera + Input Manual)**:
   - Menghasilkan 3 status tegas dengan kartu warna penuh:
     - 🟢 **VALID (Tiket Sah)**: Mencatat waktu hadir dan mengubah warna bangku di denah panitia menjadi hijau secara live.
     - 🟡 **SUDAH DIGUNAKAN (Duplikat)**: Menampilkan jam pertama kali tiket tersebut dipakai check-in.
     - 🔴 **TIDAK VALID**: Kode tiket tidak terdaftar atau milik acara lain.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript Strict
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **Database & ORM**: Neon Serverless PostgreSQL + Prisma ORM (`@prisma/adapter-neon`)
- **AI Layout**: Google Gemini (`@google/genai`) + Validasi Skema `zod`
- **WhatsApp Gateway**: Fonnte API (non-blocking)
- **Penyimpanan Gambar**: Vercel Blob (`@vercel/blob`)
- **QR Code**: `qrcode` (generator SVG/Canvas) & `html5-qrcode` (kamera scanner)

---

## Cara Menjalankan di Lokal

1. **Instal dependensi**:
   ```bash
   npm install
   ```

2. **Salin file environment**:
   ```bash
   cp .env.example .env
   ```
   Isi variabel di `.env` sesuai konfigurasi:
   - `DATABASE_URL`: Connection string Neon Postgres (pooled)
   - `DIRECT_URL` atau `DATABASE_URL_UNPOOLED`: Connection string Neon Postgres (unpooled, opsional untuk migrasi)
   - `GEMINI_API_KEY`: API Key Google AI Studio
   - `GEMINI_MODEL`: Nama model Gemini (contoh: `gemini-2.5-flash`)
   - `FONNTE_TOKEN`: Token API Fonnte untuk WhatsApp
   - `AUTH_SECRET`: Kunci rahasia minimal 32 karakter untuk penandatanganan sesi cookie admin
   - `BLOB_READ_WRITE_TOKEN`: Token Vercel Blob (opsional untuk unggah poster)
   - `NEXT_PUBLIC_APP_URL`: URL aplikasi publik (contoh: `http://localhost:3000`)

3. **Jalankan migrasi dan seed data demo**:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

4. **Jalankan server development**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

---

## Akun & Data Demo Siap Pakai (Hasil `npm run seed`)

| Kebutuhan | Nilai |
|---|---|
| **Login Penyelenggara** | URL: `/admin/login`<br>Email: `panitia@summarecon.demo`<br>Password: `bandung2026` |
| **Acara 1 (Grid 300 Kursi)** | **Bandung Tech & Creative Summit 2026** (`/e/bandung-tech-summit-2026`)<br>15 baris × 20 kolom, lorong tengah setelah kolom 10 |
| **Acara 2 (Melingkar 96 Kursi)** | **Malam Akustik Melingkar Summarecon** (`/e/malam-akustik-melingkar`)<br>3 ring melingkar (24, 32, 40 kursi), panggung di tengah |
| **Acara 3 (Draf)** | **Workshop Desain Produk Bandung** (muncul di `/admin`, siap diedit & dipublikasikan) |
| **Kursi Uji Rebutan (Available)** | Kursi **`E-5`** pada *Bandung Tech & Creative Summit 2026* |
| **Kode Tiket Demo VALID** | **`DEMO000VLD`** (Kursi `A-1` VIP, siap di-scan di `/admin/events/[id]/checkin`) |
| **Kode Tiket Demo SUDAH DIPAKAI** | **`DEMO000USD`** (Kursi `A-2` VIP, sudah check-in) |
| **Kode Tiket Demo TIDAK VALID** | **`SALAH12345`** (Kode tidak terdaftar) |

> **Reset Demo Kapan Saja**: Jalankan `npm run seed` untuk mengembalikan seluruh kursi, pesanan, dan kode tiket demo ke kondisi awal yang bersih.

---

## Arsitektur Teknis Inti

### 1. Pencegahan Double Booking (Atomic Seat Locking)
Seluruh perubahan status kursi terpusat di satu modul (`src/lib/seats.ts`):
- **Hold Atomik (`holdSeatsAndCreateOrder`)**: Menggunakan satu transaksi SQL dengan CTE `SELECT ... FROM "Seat" ... ORDER BY "id" FOR UPDATE` diikuti `UPDATE "Seat" SET "status" = 'HELD', "heldUntil" = NOW() + INTERVAL '10 minutes'`. Pengurutan `ORDER BY "id"` mencegah *deadlock* saat dua pengunjung memilih irisan kursi yang sama secara bersamaan.
- **Lazy Expiration Tanpa Cron**: Kursi berstatus `HELD` dengan `heldUntil <= NOW()` otomatis dianggap `AVAILABLE` baik saat pembacaan denah maupun saat klaim kursi baru, sehingga bekerja andal di Vercel Free Tier tanpa ketergantungan *background cron job*.
- **Pengecekan Kepemilikan Hold saat Bayar (`confirmOrderSold`)**: Saat pembayaran dikonfirmasi, server memverifikasi bahwa seluruh kursi pesanan masih memegang `holdToken` milik order tersebut. Bila masa hold habis dan kursi sudah diambil orang lain, pembayaran ditolak dengan aman tanpa pernah menjual kursi yang sama dua kali.

### 2. AI Layout (Parameter Terstruktur + Generator Deterministik)
Alih-alih meminta AI mengarang ratusan koordinat `(x, y)` piksel yang rawan tumpang-tindih:
1. **Gemini Vision (`src/lib/ai/layout.ts`)** mengekstrak **parameter terstruktur** (`type: "grid" | "circle" | "unsupported"`, `rows`, `cols`, `aisleAfterCols`, `rings`, `seatsPerRing`, `stage`, serta `warnings` dan `questions`) dari foto ruangan dan deskripsi penyelenggara, dengan angka pada teks sebagai sumber kebenaran utama.
2. **Validasi `zod`** memastikan output AI mematuhi rentang aman (maksimal 1.500 kursi per acara) dengan *retry* otomatis.
3. **Generator Deterministik (`src/lib/layout/`)** menghitung koordinat `(x, y, rotation)` setiap kursi secara presisi dan merendernya di `SeatMap` SVG untuk dikoreksi penyelenggara sebelum disimpan ke database.
