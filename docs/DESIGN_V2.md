# DESIGN_V2 — Dari aplikasi demo menjadi platform tiket

Dokumen ini adalah arah visual baru untuk GateIn. Dibuat setelah prototipe berjalan penuh, dengan satu tujuan: pengunjung langsung merasa ini tempat membeli tiket acara, bukan proyek lomba.

## 0. Cara membaca dokumen ini

- Dokumen ini **menimpa** `DESIGN.md` bagian 1 (Gaya Umum), 4 (Komponen Utama), dan 7 (Larangan Desain).
- `DESIGN.md` bagian 2 (status kursi), 3 (denah di HP), 5 (hasil scan), dan 6 (admin) tetap berlaku, dengan dua perubahan di bagian 7 dokumen ini.
- Tahap 10 sampai 13 hanya mengubah tampilan dan data tampilan (kategori acara, seed). **Dilarang** mengubah `src/lib/seats.ts`, logika hold/pay/check-in, route API yang sudah ada, dan skrip uji balapan. Setelah setiap tahap, skenario di `DEMO_SCRIPT.md` harus tetap lolos.

## 1. Diagnosis: kenapa terasa bukan platform tiket

| Aspek | Platform tiket yang sudah mapan | GateIn sekarang |
|---|---|---|
| Isi utama halaman | Poster acara. Warna datang dari poster, antarmuka dibuat netral | Hanya satu acara yang punya gambar (lomba mewarnai, yang justru terlihat paling nyata). Dua lainnya blok gelap dengan ikon kursi |
| Hero | Carousel banner acara yang lebar, slide berikutnya mengintip dari tepi | Kartu putih berisi headline teks |
| Kesan jumlah acara | Banyak, dikelompokkan per kategori dan momen (akhir pekan ini, segera habis) | Tiga kartu dalam dua kolom |
| Navigasi | Kolom pencarian dan ikon kategori | Tidak ada |
| Kartu acara | Poster, tanggal, penyelenggara, lokasi, harga "mulai dari", sinyal kelangkaan | Judul, paragraf deskripsi, tiga baris ikon kecil |
| Data | Jadwal wajar, nama penyelenggara beragam | Acara pukul 01.14 WIB (seed dijalankan tengah malam), acara tes dengan jendela penjualan dua menit |
| Bahasa | Bahasa pembeli: apa, kapan, di mana, berapa | Bahasa fitur: "Pemilihan Kursi 1:1", "Sistem E-Ticketing" |
| Identitas | Wordmark dan warna yang khas | Ikon tiket bawaan di kotak indigo, indigo generik, kartu putih seragam |

Keunggulan sebenarnya, yaitu denah kursi yang sama dengan ruangan asli, tidak terlihat sama sekali di beranda. Perbaikan: beranda dibuat poster-first, lalu denah dimunculkan sebagai bukti di halaman detail acara dan satu band penjelas.

## 2. Arah visual

**Konsep: gerbang dan karcis.** Dua benda yang akrab di dunia acara: gerbang masuk dan karcis yang bisa disobek. Dari sini lahir logo (lengkung gerbang dengan takik karcis di kedua sisi) dan satu elemen yang harus paling diingat: **kartu acara berbentuk karcis**, poster di atas, garis sobekan bertakik di tengah, lalu bagian harga di bawah.

Semua yang lain dibuat tenang supaya poster dan kartu karcis yang tampil. Jangan menambah dekorasi.

### Warna (token)

| Nama | Hex | Pemakaian |
|---|---|---|
| Tinta | `#12112B` | Teks utama, permukaan gelap, cincin kursi terpilih |
| Gerbang | `#2B2BE8` | Tombol utama, tautan, logo. Biru ultramarin yang jenuh, bukan indigo gelap |
| Karcis | `#D4FF3A` | Sorotan kecil saja: lencana "Baru", "Sisa sedikit", figur di logo. Selalu dengan teks Tinta |
| Halaman | `#F7F8FC` | Latar halaman, putih dingin tipis. Bukan krem |
| Kartu | `#FFFFFF` | Permukaan kartu |
| Garis | `#E3E5F0` | Pembatas dan tepi |
| Redam | `#5B5E7A` | Teks sekunder (kontras ke Halaman minimal 4,5:1) |

Aturan pakai: tombol utama = latar Gerbang, teks putih. Lime tidak boleh dipakai sebagai latar area besar atau teks di latar putih. Warna zona kursi tetap memakai palet di `DESIGN.md` bagian 2; yang berubah hanya cincin "Dipilih saya" menjadi Tinta dengan ikon centang.

### Tipografi

- **Display** (judul, nama acara, wordmark, angka harga): Bricolage Grotesque 700 dan 800 lewat `next/font/google`. Ketat sedikit: letter-spacing -0.02em pada ukuran besar.
- **Isi**: Figtree 400, 500, 600. Alternatif bila gagal dimuat: Plus Jakarta Sans.
- Skala: 12, 14, 16, 20, 28, 40, 56 (hero desktop). Panjang baris isi maksimal 70 karakter.
- Judul acara boleh dua baris. Tidak ada huruf kapital semua, tidak ada label kecil di atas judul section, tidak ada angka urut kecuali memang urutan (langkah beli tiket).

### Bentuk dan gerak

- Radius bertingkat sesuai hierarki, bukan satu radius untuk semuanya: poster dan kartu karcis 20px, tombol 14px, input 12px, chip dan lencana penuh (pil).
- Elevasi memakai tepi 1px Garis. Bayangan hanya pada kartu yang sedang di-hover (naik 2px) dan tombol utama di panel bawah. Tidak ada bayangan abu-abu seragam di semua kartu.
- Motif takik karcis (setengah lingkaran di kedua sisi garis putus-putus) dipakai di tiga tempat saja: kartu acara, kartu tiket, dan ringkasan pesanan. Jangan dipakai di tempat lain.
- Gerak: satu momen yang disengaja, yaitu carousel hero (transisi geser halus, berhenti saat disentuh). Selebihnya hanya respons terhadap aksi pengguna: kursi terpilih, hasil scan. Tidak ada animasi fade-in-naik di setiap section. Hormati `prefers-reduced-motion`.
- Gradien hanya sebagai scrim pembaca di atas poster (agar teks terbaca), bukan dekorasi.

## 3. Logo dan identitas

Berkas ada di `public/brand/` (lihat `ASSETS.md`).

- **Mark**: lengkung gerbang dengan dua takik karcis di sisi, dan figur kecil (kepala dan sandaran kursi) di dalamnya. Dua versi warna siap pakai (berwarna, terbalik untuk latar gelap) dan satu versi satu warna.
- **Wordmark**: teks "GateIn" yang dirender sebagai teks sungguhan (bukan gambar) dengan Bricolage Grotesque 800, di sebelah kanan mark, jarak sama dengan lebar figur. Komponen `Logo` menerima prop ukuran dan varian.
- Jangan memutar, meregangkan, memberi bayangan, atau mengganti warna mark di luar tiga varian yang ada.
- Turunan wajib: `favicon.svg`, ikon aplikasi 180x180 (untuk layar utama HP), dan gambar Open Graph 1200x630 (dibuat lewat `opengraph-image` Next.js: latar Tinta, mark, tulisan "GateIn", dan satu baris "Tiket acara dengan denah kursi asli di Summarecon Mall Bandung").

## 4. Beranda `/`

Urutan section dari atas ke bawah. Bagian yang diberi tanda (tetap) sudah ada dan hanya ditata ulang.

```
Desktop (kontainer 1200px)
┌──────────────────────────────────────────────────────────────────┐
│ [Logo GateIn]  ( Cari acara, tempat, atau penyelenggara )   [Untuk penyelenggara] │
├──────────────────────────────────────────────────────────────────┤
│ ┌peek┐ ┌─────────── SLIDE AKTIF, rasio 16:7 ──────────┐ ┌peek┐ │
│ │    │ │ poster penuh + scrim di kiri                  │ │    │ │
│ │    │ │ [Musik]                                       │ │    │ │
│ │    │ │ Malam Akustik Melingkar                       │ │    │ │
│ │    │ │ Sen, 16 Nov, 19.30 WIB                        │ │    │ │
│ │    │ │ Atrium Sawarga Courtyard                      │ │    │ │
│ │    │ │ Mulai Rp100.000        [Pilih kursi]          │ │    │ │
│ └────┘ └───────────────────────────────────────────────┘ └────┘ │
│                         ●  ○  ○  ○  ○                            │
│  (Semua) (Musik) (Teknologi) (Seni) (Pendidikan) (Komunitas)     │
├──────────────────────────────────────────────────────────────────┤
│ Sedang ramai di Bandung                          Lihat semua     │
│ [karcis][karcis][karcis][karcis]   (baris geser horizontal)      │
│ Akhir pekan ini                                  Lihat semua     │
│ [karcis][karcis][karcis][karcis]                                 │
│ Segera habis                                     Lihat semua     │
│ [karcis][karcis][karcis][karcis]                                 │
├──────────────────────────────────────────────────────────────────┤
│ BAND PENJELAS: "Lihat kursimu sebelum bayar"                     │
│   kiri: teks 2 kalimat. kanan: potongan denah asli (komponen     │
│   SeatMap mode view, data dari acara unggulan, tanpa interaksi)  │
├──────────────────────────────────────────────────────────────────┤
│ BAND PENYELENGGARA (latar Tinta): "Punya acara? Foto ruangannya, │
│   denah kursinya jadi otomatis."            [Buat acara]         │
├──────────────────────────────────────────────────────────────────┤
│ Footer                                                           │
└──────────────────────────────────────────────────────────────────┘
```

Rincian:

- **Carousel hero**: 3 sampai 5 acara dengan `isFeatured`. Di desktop slide berikutnya mengintip 8 persen di kiri dan kanan. Di HP satu slide penuh dengan geser (swipe), rasio 4:5 dengan teks di bagian bawah. Otomatis berpindah tiap 6 detik, berhenti saat disentuh atau di-hover, dan tidak otomatis bila `prefers-reduced-motion`. Gambar slide pertama `priority`, sisanya lazy. Tombol panah dan titik bisa diakses keyboard.
- **Ikon kategori**: baris ikon bulat dengan label. Ikon dibuat sebagai SVG sederhana satu gaya (garis 2px, warna Tinta, latar Gerbang 8 persen). Klik memfilter daftar di bawah tanpa pindah halaman (`?kategori=musik`). Kategori tanpa acara tidak ditampilkan.
- **Pencarian**: memfilter di sisi klien berdasarkan nama acara, tempat, dan penyelenggara. Hasil kosong memakai pesan arahan (lihat bagian 11).
- **Baris acara**: tiga baris bertema dari data nyata, tanpa data palsu:
  - "Sedang ramai di Bandung": urut jumlah tiket terjual terbanyak
  - "Akhir pekan ini": acara yang mulai Jumat sampai Minggu terdekat
  - "Segera habis": acara dengan sisa kursi di bawah 25 persen
  Bila satu baris kurang dari 3 acara, baris disembunyikan. Di HP baris bisa digeser dengan snap, kartu selebar 78 persen layar.
- **Strip angka kecil** di bawah carousel (opsional): "8 acara dibuka", "1.240 tiket terjual", dihitung dari database. Tidak ada angka karangan.
- **Band penjelas** dan **band penyelenggara**: satu per halaman, tidak diulang.
- **Footer**: logo, satu kalimat tentang GateIn, tautan Daftar acara, Untuk penyelenggara, dan catatan "Pembayaran di prototipe ini disimulasikan". Satu baris kecil "Dibuat untuk Bandung Build Challenge 2026". **Jangan** menampilkan logo bank, e-wallet, atau toko aplikasi: itu menyiratkan layanan yang tidak ada.

## 5. Kartu acara berbentuk karcis (elemen yang paling diingat)

```
┌──────────────────────────┐
│   poster 16:9, radius    │   ← kiri atas: pil kategori
│   atas 20px              │   ← kanan atas: lencana tanggal (hari besar, bulan kecil)
│                          │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤   ← garis putus-putus, takik setengah lingkaran di kiri dan kanan
│ Nama acara maksimal      │
│ dua baris                │
│ Penyelenggara            │
│ Venue                    │
│ Mulai dari               │
│ Rp75.000    [Sisa 12]    │   ← lencana Karcis (lime) muncul bila sisa < 25%
└──────────────────────────┘
```

- Satu kartu = satu tautan penuh ke `/e/[slug]`. Hover: kartu naik 2px, poster membesar 1.03 (lambat), tanpa perubahan lain.
- Status penjualan: "Belum dibuka", "Ditutup", "Sold out" memakai pil di atas poster dan poster diredam (grayscale 60 persen). Kartu tetap bisa dibuka.
- Tanggal tampil sebagai lencana, tidak diulang di teks. Jam dan venue di dalam kartu memakai satu baris teks Redam, tanpa deretan ikon.
- Sinyal sosial hanya dari data nyata: "128 tiket terjual". Dilarang membuat avatar palsu atau "1000+ going".

## 6. Detail acara `/e/[slug]`

- **Atas**: poster sebagai latar buram penuh lebar (blur dan diredam) dengan poster tajam di depan, rasio 16:9, kontainer 1100px. Bukan gambar tunggal yang dipotong kasar.
- **Dua kolom di desktop**: kiri berisi tab Deskripsi, Jadwal, Lokasi, Kebijakan. Kanan berisi **kartu beli yang menempel (sticky)**: harga mulai dari, tanggal dan jam, jam open gate, sisa kursi, tombol "Pilih kursi".
- **Pratinjau denah**: di bawah tab, tampilkan denah asli acara (SeatMap mode view, tidak bisa dipilih) dengan batang ketersediaan per zona ("VIP, Rp150.000, 41 dari 60 tersedia"). Ini bukti utama GateIn berbeda.
- **HP**: kartu beli menjadi panel bawah yang menempel berisi harga dan tombol "Pilih kursi".
- Pil status penjualan tetap tampil dengan penjelasan jelas ("Penjualan dibuka sampai 13 Nov, 11.00 WIB").

## 7. Alur beli `/e/[slug]/beli`, bayar, pesanan

- Header alur: tiga langkah bernomor (ini memang urutan) dengan mini poster dan nama acara di kiri. Langkah selesai bercentang.
- **Denah**: logika tidak berubah. Dua perbaikan tampilan:
  1. Legenda "Tersedia" tidak lagi memakai warna zona pertama (di layar sekarang tampak merah, padahal kursi Reguler berwarna teal). Gunakan kotak tepi tegas dengan teks "Tersedia (warna sesuai zona)".
  2. Cincin "Dipilih saya" memakai Tinta, bukan indigo.
- Panel bawah menempel: chip kursi, total, tombol utama "Tahan kursi dan lanjut".
- `CountdownBar`: pil Tinta dengan angka Bricolage besar, berubah jadi lime bertulisan Tinta saat sisa di bawah 2 menit.
- Ringkasan pesanan dan halaman bayar: kartu dengan takik karcis, mini poster, rincian kursi. Label "Mode simulasi" tetap ada, nada netral (bukan banner biru besar).

## 8. Tiket `/pesanan/[orderId]` dan `/tiket/[code]`

- Tiket digambar seperti karcis sungguhan: sisi kiri berisi poster kecil, nama acara, kursi besar (Bricolage 800), zona, pemegang, jadwal, jam open gate. Sisi kanan (atau bawah di HP) berisi QR besar dan kode. Pemisah berupa garis sobekan putus-putus dengan takik.
- Latar kartu putih, strip atas Gerbang dengan mark GateIn. Bukan kartu ungu gelap.
- Status "Sudah digunakan" menutup QR dengan cap miring dan jam check-in.
- Tombol "Simpan gambar tiket" tetap. Hasil gambar harus ikut gaya karcis.

## 9. Admin (poles ringan)

- Ganti kotak ikon bawaan dengan komponen `Logo` varian terbalik atau berwarna, tambahkan kata "Panitia" sebagai pil.
- Dashboard: kartu statistik memakai angka Bricolage, tanpa warna latar pastel berbeda-beda. Satu aksen per kartu cukup.
- Daftar acara di dashboard menampilkan thumbnail poster 16:9 kecil di kiri tiap baris.
- Wizard langkah 1 mendapat pilihan **Kategori** dan unggah poster dengan pratinjau; langkah review menampilkan kartu karcis seperti yang akan dilihat pengunjung. Bug yang terlihat di layar: ringkasan review menampilkan "Nama acara: –" bila kosong. Wajibkan nama sebelum lanjut dan tampilkan pesan yang jelas.
- Layar hasil scan tetap penuh warna sesuai `DESIGN.md` bagian 5.

## 10. Data tampilan dan seed

### Penambahan skema (satu-satunya perubahan database di tahap 11)

- `Event.organizerName`: String opsional, nama penyelenggara yang tampil ke pengunjung. Wizard langkah 1 mendapat isian ini (diisi awal dengan `Organizer.name`).
- `Event.category`: enum `MUSIC`, `TECH`, `ARTS`, `EDUCATION`, `COMMUNITY`, `SPORTS`. Default `COMMUNITY`. Label tampil: Musik, Teknologi dan bisnis, Seni dan hiburan, Pendidikan dan workshop, Komunitas dan gaya hidup, Olahraga.
- `Event.isFeatured`: Boolean, default `false`. Hanya diatur lewat seed (bukan wizard).
- Perbarui `DATA_MODEL.md` bagian Event dengan ketiga kolom ini. Migrasi harus aman untuk data yang sudah ada (pakai default).

### Aturan waktu seed (memperbaiki "01.14 WIB")

- Waktu acara selalu jam bulat WIB yang wajar (09.00, 13.00, 16.00, 19.00, 19.30), dihitung dari tanggal hari seed dijalankan ditambah N hari, **bukan** jam saat seed berjalan.
- Open gate mulai 90 menit sebelum acara, selesai 30 menit setelah acara mulai.
- Penjualan dibuka 3 hari lalu pukul 08.00 WIB dan ditutup 2 jam sebelum acara.
- Seluruh jam dikonversi dengan benar ke UTC saat disimpan.

### Daftar acara (fiktif, semuanya di area Summarecon Mall Bandung)

Dua acara pertama wajib tetap sesuai `DEMO_SCRIPT.md` (layout, zona, harga, kode tiket demo). Enam sisanya baru. Semua penyelenggara fiktif dan tidak boleh memakai nama merek atau tokoh sungguhan.

| Slug | Nama | Kategori | Penyelenggara | Venue | Mulai | Layout | Zona dan harga | Terjual | Unggulan |
|---|---|---|---|---|---|---|---|---|---|
| `bandung-tech-summit-2026` | Bandung Tech Summit 2026 | TECH | Priangan Tech Collective | Convention Hall Lt. 2 | +7 hari 09.00 | grid 15x20 | VIP A-C Rp150.000, Reguler Rp75.000 | sekitar 40 | ya |
| `malam-akustik-melingkar` | Malam Akustik Melingkar | MUSIC | Senja Sessions | Atrium Sawarga Courtyard | +10 hari 19.30 | lingkaran 24+32+40 | Ring 1 Rp150.000, Ring 2-3 Rp100.000 | sekitar 20 | ya |
| `ketawa-kota-kembang` | Ketawa Kota Kembang: Malam Stand-up | ARTS | Kembang Komedi | Open Stage Lt. LG | +5 hari 19.00 | grid 10x16 | VIP A-B Rp135.000, Reguler Rp85.000 | sekitar 60% | ya |
| `simfoni-kota-orkestra-muda` | Simfoni Kota: Orkestra Muda Bandung | MUSIC | Bandung Youth Orchestra | Convention Hall Lt. 2 | +14 hari 16.00 | grid 12x18, lorong setelah kolom 9 | VIP A-D Rp175.000, Reguler Rp90.000 | sekitar 35% | ya |
| `pentas-wayang-golek-reimagined` | Pentas Wayang Golek Reimagined | ARTS | Sanggar Sekar Priangan | Atrium Sawarga Courtyard | +12 hari 15.00 | lingkaran 18+26+34 | Ring 1 Rp120.000, Ring 2-3 Rp80.000 | sekitar 20% | ya |
| `workshop-fotografi-jalanan` | Workshop Fotografi Jalanan Bandung | EDUCATION | Lensa Kota | Creative Hub Lt. 1 | +6 hari 13.00 | grid 6x10 | Reguler Rp120.000 | sekitar 80% (sisa 12) | tidak |
| `career-talk-jalur-kerja-2027` | Career Talk: Jalur Kerja 2027 | EDUCATION | Forum Karier Mahasiswa Bandung | Convention Hall Lt. 2 | +9 hari 10.00 | grid 12x18 | Reguler Rp35.000 | sekitar 30% | tidak |
| `festival-kopi-priangan-cupping` | Festival Kopi Priangan: Sesi Cupping | COMMUNITY | Komunitas Ngopi Priangan | Open Stage Lt. LG | +4 hari 10.00 | grid 8x12 | Reguler Rp65.000 | sekitar 50% | tidak |

Aturan seed tambahan:

- Setiap kursi SOLD wajib punya order PAID dan tiket (data konsisten, seperti aturan sebelumnya). Sebagian kecil tiket diberi status USED agar angka "hadir" terisi.
- Semua acara di atas dimiliki `panitia@demo.id` supaya muncul di dashboard admin saat demo. Nama penyelenggara yang tampil di kartu dan halaman detail diambil dari `Event.organizerName`, dan bila kosong dipakai `Organizer.name`. Tidak perlu membuat akun penyelenggara baru.
- Seed harus tetap idempotent. Acara tes buatan tangan (misalnya "lomba mewarnai") tidak boleh dihapus oleh seed; hapus manual sebelum demo bila tidak diperlukan.
- Poster: `posterUrl` menunjuk `/posters/{slug}.webp`. Bila berkas belum ada, tampil `PosterFallback`.

## 11. Bahasa tampilan

Tulis dari sudut pandang pembeli: kalimat biasa, kata kerja aktif, huruf kecil pada awal kata kecuali awal kalimat. Satu aksi memakai satu nama di seluruh alur.

| Tempat | Gunakan |
|---|---|
| Tombol dari beranda sampai denah | "Pilih kursi" |
| Tombol setelah memilih | "Tahan kursi dan lanjut" |
| Tombol di halaman bayar | "Simulasikan pembayaran berhasil" / "Simulasikan pembayaran gagal" |
| Pencarian | "Cari acara, tempat, atau penyelenggara" |
| Hasil kosong | "Belum ada acara yang cocok. Coba kata lain atau pilih Semua." |
| Kursi diambil orang lain | "Kursi B-12 baru saja diambil. Pilih kursi lain, denah sudah diperbarui." |
| Band penjelas | "Lihat kursimu sebelum bayar. Denah di sini sama dengan susunan kursi di ruangan." |
| Band penyelenggara | "Punya acara? Foto ruangannya, denah kursinya jadi otomatis." |

Hapus dari tampilan publik: "Pemilihan Kursi 1:1", "Sistem E-Ticketing", "Pilih Kursi Anda dengan Pasti Sebelum Membeli Tiket". Gunakan "kamu" pada beranda dan detail acara, konsisten.

## 12. Larangan (menimpa DESIGN.md bagian 7)

- Dilarang menyalin logo, ikon, ilustrasi, tata letak persis, atau teks milik platform lain. Pola umum (carousel, kategori, baris acara) boleh, bentuk dan identitasnya harus milik GateIn.
- Dilarang memakai logo bank, e-wallet, merek, artis, atau tokoh sungguhan, di UI maupun di poster.
- Dilarang membuat sinyal sosial atau angka palsu (avatar, "going", ulasan, diskon).
- Dilarang menjadikan semua blok kartu putih seragam bergradien ungu, label huruf kapital di atas judul, penanda angka 01/02/03 untuk konten yang bukan urutan, huruf monospace untuk label biasa, tanda panah "→" di akhir teks tombol, dan emoji sebagai ikon.
- Dilarang menyembunyikan harga atau status penjualan.

## 13. Kriteria selesai

- Beranda di 390px dan 1440px: poster mendominasi, carousel jalan, kategori dan pencarian berfungsi, minimal tiga baris acara terisi.
- Tidak ada blok gelap berisi ikon kursi sebagai pengganti poster.
- Tidak ada jam acara yang aneh (di luar 08.00 sampai 22.00 WIB) pada data seed.
- Skenario `DEMO_SCRIPT.md` nomor 1 sampai 10 lolos, dan skrip uji balapan masih lolos.
- Ambil tangkapan layar sebelum dan sesudah untuk beranda, detail acara, denah, dan tiket di 390px dan 1440px, simpan di `docs/screenshots/` untuk bahan deck.