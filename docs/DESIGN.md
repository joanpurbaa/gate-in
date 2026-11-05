# DESIGN — Gaya UI, Warna Status Kursi, Halaman

Prinsip: **mobile-first** (lebar acuan 390px), jelas, cepat dibaca. Prioritas visual: denah kursi dan kejelasan status. Bukan tampilan template bawaan.

## 1. Gaya Umum

- Font: satu keluarga sans-serif yang bersih lewat `next/font` (disarankan **Plus Jakarta Sans**), bobot 400/500/700
- Warna dasar: latar putih hangat (`#FAFAF7`), teks gelap (`#171717`), aksen utama **indigo tua** (`#3730A3`) untuk tombol utama dan seleksi
- Sudut membulat sedang, bayangan tipis, banyak ruang putih
- Tombol utama lebar penuh di HP, tinggi minimal 48px
- Semua teks UI berbahasa Indonesia, format Rupiah `Rp150.000`, tanggal "Sabtu, 14 Nov 2026 • 19.00 WIB"
- Setiap halaman punya: state **loading** (skeleton), **kosong**, dan **error** yang ramah
- Tanpa dark mode

## 2. Status Kursi (inti penilaian)

Status **tidak boleh dibedakan hanya dengan warna**; tambahkan bentuk/ikon/pola.

| Status | Tampilan |
|---|---|
| Tersedia | Terisi **warna zona**, tepi tegas |
| Ditahan / dipesan orang lain | **Amber** `#F59E0B` dengan pola garis diagonal |
| Terjual | **Abu-abu** `#9CA3AF`, ikon silang kecil, tidak bisa diklik |
| Dipilih saya | Cincin tebal indigo + ikon centang, sedikit membesar |
| Hadir (hanya admin) | **Hijau** `#16A34A` + ikon centang |
| Kursi dihapus/lorong | Tidak digambar |

Warna zona memakai palet yang **menghindari amber, abu-abu, dan hijau**: indigo muda `#6366F1`, rose `#F43F5E`, sky `#0EA5E9`, violet `#A855F7`, teal `#14B8A6`, orange tua `#EA580C`. Kontras minimal cukup untuk dibaca di luar ruangan.

**Legenda** selalu terlihat dekat denah (zona + harga, tersedia, ditahan, terjual, pilihanmu). Di HP legenda bisa berupa baris yang bisa digeser.

## 3. Denah di HP

- Denah memenuhi lebar layar, bisa pinch-zoom & geser, tombol + / − / reset
- Tap kursi → kartu kecil: label, zona, harga, status; tombol "Pilih" bila tersedia
- Panggung digambar jelas dengan label
- Panel bawah menempel (sticky): kursi terpilih (chip), total harga, tombol **Lanjut**
- Setelah hold: bar hitung mundur `09:41` jelas di atas ringkasan dan halaman bayar
- Saat kursi gagal ditahan: toast + denah dimuat ulang, kursi yang diambil orang lain berubah amber/abu-abu

## 4. Komponen Utama

- `SeatMap`, `SeatLegend`, `SeatTooltipCard`, `SelectedSeatsBar`, `CountdownBar`
- `EventCard`, `StatusPill` (Belum dibuka / Dibuka / Ditutup / Sold out)
- `TicketCard` (QR besar, kode, event, kursi, jam open gate), tombol unduh/simpan gambar bila mudah
- `StatCard` (admin), `DataTable` (responsif, bisa digulir di HP), `ScanResultPanel`
- `Wizard` / stepper untuk pembuatan event

## 5. Hasil Scan (Check-in)

Layar penuh berwarna selama ±3 detik, lalu kembali ke mode scan:
- **VALID** — hijau, nama, kursi, zona
- **SUDAH DIGUNAKAN** — oranye/merah, jam check-in pertama
- **TIDAK VALID** — merah, pesan singkat
Dengan ikon besar dan (opsional) getaran/bunyi singkat. Input kode manual tersedia sebagai cadangan.

## 6. Admin

- Desktop dan HP sama-sama layak; dashboard ringkas: terjual, hadir, sisa, pendapatan
- Denah live berwarna: tersedia / ditahan / terjual / hadir
- Tabel peserta dan transaksi: cari, filter status, tombol **Unduh CSV**

## 7. Larangan Desain

- Jangan memakai tampilan "template" generik penuh gradien ungu dan kartu seragam
- Jangan mengandalkan warna saja untuk membedakan status
- Jangan menyembunyikan harga atau status penjualan