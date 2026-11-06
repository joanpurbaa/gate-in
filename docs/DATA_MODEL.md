# DATA_MODEL — Skema, Status, dan Locking Kursi

ORM: Prisma + Neon Postgres. Waktu disimpan UTC. Harga dalam Rupiah bilangan bulat (`Int`).

## 1. Tabel

### Organizer
`id`, `email` (unik), `name`, `passwordHash`, `createdAt`. Diisi lewat seed saja.

### Event
`id`, `organizerId`, `slug` (unik), `name`, `description`, `posterUrl?`,
`venueName`, `venueAddress?`,
`startsAt`, `gateOpenAt`, `gateCloseAt`,
`salesOpenAt`, `salesCloseAt`,
`maxSeatsPerOrder` (default 5),
`contactInfo?`, `policyNote?`,
`organizerName?` (nama penyelenggara publik yang tampil ke pengunjung),
`category` (`MUSIC` | `TECH` | `ARTS` | `EDUCATION` | `COMMUNITY` | `SPORTS`, default `COMMUNITY`),
`isFeatured` (Boolean, default `false`),
`status` (`DRAFT` | `PUBLISHED`),
`layout` (Json — lihat SEAT_LAYOUT_SPEC; sumber kebenaran struktur),
`layoutLocked` (Boolean, true setelah ada hold/penjualan pertama),
`createdAt`, `updatedAt`.

### Zone
`id`, `eventId`, `name`, `color` (hex), `price` (Int), `sortOrder`.

### Seat
`id`, `eventId`, `zoneId?` (null = belum diberi zona; event tidak boleh publish bila masih ada kursi tanpa zona),
`label` (unik per event, contoh `A-12`, `R1-07`), `rowLabel`, `number`,
`x`, `y` (Float, koordinat kanvas), `rotation` (Float, derajat, default 0),
`status` (`AVAILABLE` | `HELD` | `SOLD`),
`heldUntil?`, `holdToken?`, `orderId?`.
Index: `(eventId, status)`, unik `(eventId, label)`.

### Order
`id` (cuid panjang, tidak bisa ditebak), `eventId`, `buyerName`, `buyerPhone` (format 62xxx),
`status` (`PENDING` | `PAID` | `FAILED` | `EXPIRED`),
`totalAmount` (Int), `holdToken`, `holdExpiresAt`,
`paymentRef?`, `paidAt?`, `expiredAt?`, `expiredNotifiedAt?`, `waStatus?` (`SENT` | `FAILED` | `SKIPPED`), `createdAt`.
Index: `(eventId, status)`, `(status, holdExpiresAt)`.

### Ticket
`id`, `orderId`, `eventId`, `seatId` (**unik**), `code` (**unik**), `status` (`VALID` | `USED`),
`checkedInAt?`, `checkedInBy?` (organizerId), `createdAt`.

### WaitingListEntry
`id` (cuid), `eventId`, `zoneId`, `buyerName`, `buyerPhone` (format 62xxx),
`quantity` (Int, default 1), `status` (`WAITING` | `OFFERED` | `CONVERTED` | `EXPIRED` | `CANCELLED`),
`token` (**unik**, unguessable hex), `offerExpiresAt?`, `offerNotifiedAt?`, `convertedOrderId?`,
`createdAt`, `updatedAt`.
Index: `(eventId, zoneId, status, createdAt)`, `(token)`, `(status, offerExpiresAt)`.

Aturan Antrean & Penawaran:
- Pendaftar unik: satu nomor WhatsApp hanya boleh memiliki 1 entri aktif (`WAITING` / `OFFERED`) per acara dan per zona.
- Urutan FIFO (`createdAt ASC`) per acara dan per zona tiket.
- Kuota permintaan utuh: calon pembeli yang meminta $Q$ tiket hanya akan ditawari jika jumlah kursi tersedia $\ge Q$.
- Masa aktif penawaran: default 15 menit (`offerExpiresAt`). Jika tidak dikonversi sebelum batas waktu, status menjadi `EXPIRED` dan penawaran diteruskan otomatis ke kandidat antrean berikutnya.
- Reservasi tetap menggunakan atomic locking melalui `holdSeatsAndCreateOrder`. Token penawaran berubah menjadi `CONVERTED` saat pemesanan berhasil dibuat.

## 2. Status Kursi

Status yang tersimpan: `AVAILABLE`, `HELD`, `SOLD`.
**Status efektif** (yang dilihat pengunjung): `HELD` yang `heldUntil < now()` dianggap `AVAILABLE`. Tidak perlu cron job; dihitung saat query/ketika hold.
**Hadir** bukan status kursi: kursi `SOLD` dengan tiket `USED` ditampilkan hijau di sisi admin.

Transisi yang sah:
- `AVAILABLE` → `HELD` (pengunjung menekan Lanjut)
- `HELD` → `AVAILABLE` (release manual, gagal bayar, atau kedaluwarsa)
- `HELD` → `SOLD` (bayar sukses)
- `SOLD` → (final; refund di luar scope)

## 3. Pencegahan Pemesanan Ganda (WAJIB)

Semua dilakukan di `src/lib/seats.ts`, dalam satu transaksi database.

**Hold (atomik)**
Satu `UPDATE` untuk semua kursi yang dipilih, dengan syarat per baris:
`status = AVAILABLE` **atau** (`status = HELD` **dan** `heldUntil < now()`), dan `eventId` cocok.
Set `status = HELD`, `heldUntil = now() + 10 menit`, `holdToken = token pesanan`.
Jika jumlah baris yang berubah ≠ jumlah kursi yang diminta → **rollback semua**, kembalikan error `SEATS_TAKEN` beserta label kursi yang gagal. UI menampilkan "Kursi X baru saja diambil, pilih kursi lain" dan memuat ulang denah.
Gunakan raw query (`$executeRaw`) atau mekanisme Prisma yang menghasilkan satu statement atomik. Jangan memakai pola "baca dulu lalu tulis" (celah balapan).

**Confirm sold (bayar sukses)**
`UPDATE` kursi menjadi `SOLD` dengan syarat `holdToken = token pesanan` **dan** `status = HELD`. Jika hold sudah kedaluwarsa tapi belum diambil orang lain (token masih milik pesanan), pembayaran tetap diterima. Jika token sudah berganti, pesanan gagal dengan pesan jelas dan kursi tidak dijual dua kali.
Dalam transaksi yang sama: pesanan → `PAID`, buat `Ticket` per kursi (kode unik), set `layoutLocked = true`.

**Release**
Kursi dengan `holdToken` pesanan dikembalikan `AVAILABLE` (token dan heldUntil dikosongkan). Dipanggil saat gagal bayar, pengguna membatalkan, atau saat pesanan kedaluwarsa terdeteksi.

**Jaring pengaman**: `Ticket.seatId` unik. Meski ada bug logika, database menolak dua tiket untuk satu kursi.

**Pesanan kedaluwarsa**: pesanan `PENDING` yang `holdExpiresAt < now()` diperlakukan `EXPIRED` saat diakses (tanpa cron). Halaman bayar menampilkan pesan dan tombol kembali ke denah.

## 4. Kode Tiket & QR

- Kode: 10 karakter huruf besar + angka tanpa karakter membingungkan (tanpa `0 O 1 I L`), contoh `K7M2QX9PTA`, unik, acak kriptografis.
- Isi QR = **kode saja** (bukan data kursi). Server yang memeriksa.

## 5. Check-in (atomik)

`UPDATE Ticket SET status='USED', checkedInAt=now(), checkedInBy=? WHERE code=? AND eventId=? AND status='VALID'`.
- 1 baris berubah → **VALID** (kembalikan nama, kursi, zona)
- 0 baris, tiket ada & `USED` → **SUDAH DIGUNAKAN** (kembalikan jam check-in pertama)
- 0 baris, tiket tidak ada / event berbeda → **TIDAK VALID**
Tiket valid di luar jam open gate: tetap diproses, tapi tampilkan peringatan "di luar jam open gate".

## 6. Seed

Lihat `DEMO_SCRIPT.md`. Seed harus idempotent (aman dijalankan ulang; boleh reset data demo).