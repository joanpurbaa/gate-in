# PRD — Platform Event Ticketing dengan Pemilihan Kursi

Bandung Build Challenge 2026 • Tema: Event Ticketing System (fokus pemilihan kursi) • Lokasi final: Summarecon Mall Bandung.

## 1. Tujuan

Pengunjung bisa melihat acara, memilih kursi di denah yang **mencerminkan susunan asli ruangan**, membayar (simulasi), dan menerima e-ticket QR. Panitia bisa membuat acara dengan mudah (layout kursi dibuat dari foto + deskripsi dibantu AI), memantau penjualan, dan memvalidasi tiket saat check-in.

Pembeda utama: **penyelenggara tidak perlu menggambar denah**. Cukup foto ruangan + jumlah baris/kolom atau deskripsi bentuk, lalu AI menghasilkan parameter layout yang diubah kode menjadi koordinat tiap bangku.

## 2. Peran

| Peran | Login | Kebutuhan |
|---|---|---|
| Pengunjung | Tidak perlu | Lihat event, beli tiket, lihat tiket |
| Penyelenggara | Ya (akun seed, tanpa registrasi publik) | Buat event, atur layout/zona/harga, pantau, check-in, unduh data |

## 3. Alur Pengunjung

1. Buka beranda → daftar event published → pilih event
2. Halaman event: poster, deskripsi, tanggal/jam, tempat, jam open gate, status penjualan, rentang harga, tombol **Beli Tiket**
3. Isi **nama** dan **nomor WhatsApp**
4. Denah kursi: legenda jelas (tersedia, dipesan/ditahan, terjual, pilihan saya), warna per zona + harga. Pilih 1–5 kursi
5. Tekan **Lanjut** → kursi **ditahan 10 menit** (hitung mundur terlihat) → halaman ringkasan (kursi, zona, harga, total, status pesanan)
6. **Bayar** (halaman simulasi: tombol "Simulasikan berhasil" / "Simulasikan gagal")
7. Berhasil → halaman pesanan berisi satu tiket per kursi: **QR, kode tiket, nama event, kursi, jam open gate**. Tiket yang sama dikirim ke WhatsApp
8. Gagal/expired → kursi kembali tersedia, pengunjung diberi pesan jelas dan bisa mencoba lagi

Akses halaman pesanan/tiket tanpa login memakai ID acak panjang (tidak bisa ditebak).

## 4. Alur Penyelenggara

1. Login → dashboard daftar event + ringkasan angka
2. **Buat event** (wizard):
   - a. **Info dasar**: nama, deskripsi, poster (opsional), tanggal & jam acara, tempat, open gate mulai–selesai, tanggal buka & tutup penjualan, maks. kursi per pesanan (default 5), kontak penyelenggara, catatan kebijakan refund (teks saja)
   - b. **Layout kursi**: upload foto + deskripsi → AI menghasilkan parameter → **preview** → koreksi (lihat `SEAT_LAYOUT_SPEC.md`). Alternatif tanpa AI: pilih template manual (grid/lingkaran) dan isi angka
   - c. **Zona & harga**: pilih kursi/baris/ring → tetapkan zona (nama, warna, harga)
   - d. **Review & Publish** (status draft → published)
3. **Detail event**: ringkasan (tiket terjual, hadir, sisa, pendapatan), denah live, tabel transaksi, tabel peserta, unduh CSV
4. **Check-in** (HP): scan QR kamera (+ input kode manual sebagai cadangan) → hasil **VALID / SUDAH DIGUNAKAN / TIDAK VALID** → kursi di denah admin berubah **hijau**, angka hadir bertambah

## 4b. Aturan bisnis

- Kuota = jumlah kursi per zona (tidak ada input kuota terpisah)
- 1 kursi = 1 tiket = 1 QR
- Kursi ditahan **10 menit**; lewat itu otomatis tersedia lagi
- Layout **terkunci** setelah ada kursi yang ditahan/terjual (zona & harga masih boleh diubah hanya untuk kursi yang belum terjual; sederhanakan: kunci layout saja)
- Penjualan hanya aktif antara tanggal buka dan tutup penjualan serta status published
- Event sold out ditandai jelas

## 5. Halaman & Rute

**Publik**
- `/` daftar event
- `/e/[slug]` detail event
- `/e/[slug]/beli` data diri → denah → ringkasan
- `/bayar/[orderId]` pembayaran simulasi
- `/pesanan/[orderId]` daftar tiket pesanan
- `/tiket/[code]` satu tiket (QR besar)

**Admin**
- `/admin/login`
- `/admin` dashboard
- `/admin/events/new` wizard buat event
- `/admin/events/[id]` ringkasan + denah live + tab transaksi/peserta
- `/admin/events/[id]/edit` ubah info, zona, harga
- `/admin/events/[id]/checkin` scanner + denah hijau

**API (ringkas)**
- `GET /api/events/[slug]/seats` status kursi (dipakai polling 5 dtk)
- `POST /api/orders` buat pesanan + hold kursi (atomik)
- `POST /api/orders/[id]/pay` simulasi bayar (sukses/gagal)
- `POST /api/orders/[id]/release` lepas hold
- `POST /api/admin/layout/analyze` AI layout (foto + deskripsi → parameter)
- `POST /api/admin/checkin` validasi QR
- `GET /api/admin/events/[id]/live` status kursi + hadir (polling 3 dtk)
- `GET /api/admin/events/[id]/export?type=peserta|transaksi` CSV

## 6. Pemetaan ke Persyaratan Brief

| Persyaratan brief | Di aplikasi |
|---|---|
| Pilih kategori tiket | Zona berwarna + harga di denah |
| Pilih kursi lewat denah ber-status | SeatMap SVG + legenda |
| Ringkasan pesanan & status | Halaman ringkasan + timer hold |
| Konfirmasi pembayaran simulasi | `/bayar/[orderId]` |
| E-ticket QR | `/tiket/[code]` + WhatsApp |
| Status kursi konsisten | Satu sumber: tabel `Seat`, hanya diubah via `lib/seats.ts` |
| Pencegahan pemesanan ganda | Hold atomik + unique constraint (lihat DATA_MODEL) |
| QR valid / sudah digunakan / tidak valid | `/api/admin/checkin` |
| Tampilan panitia (atur tiket, data, kehadiran) | Wizard, dashboard, peserta, check-in |
| Mobile-first | Semua halaman publik + check-in dirancang untuk HP |
| Data peserta & laporan | Tabel + unduh CSV |

## 7. Asumsi (dipakai juga untuk deck)

- Event berlangsung di ruang acara fiktif di Summarecon Mall Bandung (denah bukan denah resmi mall)
- Event demo 1: **Bandung Tech Summit 2026**, kursi grid 15 baris × 20 kolom = 300 kursi; Zona VIP (baris A–C, Rp150.000), Reguler (baris D–O, Rp75.000)
- Event demo 2: **Malam Akustik Melingkar**, panggung di tengah, 3 ring (24+32+40 = 96 kursi), 2 lorong; Ring 1 VIP Rp150.000, Ring 2–3 Reguler Rp100.000
- Pembayaran simulasi, tanpa data kartu/rekening
- Notifikasi WhatsApp lewat Fonnte (jika gagal saat demo, tiket tetap tampil di web)
- Hold kursi 10 menit; maksimal 5 kursi per pesanan
- Layout dihasilkan AI dari parameter terstruktur lalu divalidasi dan dikoreksi penyelenggara; hasilnya setia pada struktur (jumlah, susunan, posisi relatif), bukan pada piksel foto

## 8. Di Luar Scope (jangan dikerjakan)

Refund/pembatalan, waitlist, pengingat otomatis, registrasi penyelenggara mandiri, login pengunjung, layout bentuk bebas (freeform), payment gateway asli, integrasi sistem Summarecon, multi-bahasa, dark mode.
Boleh disebut sebagai pengembangan lanjutan di deck.

## 9. Kriteria Selesai (MVP)

Semua skenario di `DEMO_SCRIPT.md` lolos di HP dan di versi Vercel (bukan hanya lokal).