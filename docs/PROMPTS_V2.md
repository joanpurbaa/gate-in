# PROMPTS_V2 — Redesain visual GateIn (Tahap 10 sampai 13)

Untuk dipakai setelah prototipe berjalan penuh. Semua prompt berisi teks saja. Agent membaca dokumennya sendiri.

## A. Persiapan (sekali, sebelum Prompt 10)

**1. Taruh berkas di repo**

| Berkas | Tujuan |
|---|---|
| `DESIGN_V2.md` | `docs/DESIGN_V2.md` |
| `ASSETS.md` | `docs/ASSETS.md` |
| `PROMPTS_V2.md` | `docs/PROMPTS_V2.md` (untukmu, agent tidak perlu membacanya) |
| `gatein-mark.svg`, `gatein-mark-reversed.svg`, `gatein-mark-mono.svg`, `favicon.svg` | `public/brand/` |

**2. Tambahkan teks ini ke `AGENTS.md`**

- Di daftar "Wajib dibaca sebelum menulis kode", tambahkan di bawah `docs/DESIGN.md`: `docs/DESIGN_V2.md` (arah visual, menimpa bagian gaya di DESIGN.md) dan `docs/ASSETS.md`.
- Di "Aturan keras", tambahkan aturan 12: "Tahap 10 sampai 13 hanya mengubah tampilan dan data tampilan. Dilarang mengubah src/lib/seats.ts, logika hold/pay/check-in, dan route API yang sudah ada, kecuali penambahan field kategori seperti tertulis di DESIGN_V2.md bagian 10. Setelah setiap tahap, skenario DEMO_SCRIPT.md dan skrip uji balapan harus tetap lolos."
- Di "Library yang diizinkan", tambahkan catatan: "Tahap 10 sampai 13 tidak menambah library. Carousel dibuat dengan CSS scroll-snap dan sedikit kode sendiri."

**3. Tambahkan ke `docs/PROGRESS.md`** di daftar Tahap:

- [ ] **10. Fondasi visual**: token warna dan tipografi, logo, header dan footer, PosterImage dan PosterFallback, perbaikan legenda dan cincin kursi
- [ ] **11. Beranda marketplace + data realistis**: kategori, isFeatured, organizerName, seed 8 acara, hero carousel, kategori, pencarian, baris acara, kartu karcis, band penjelas dan penyelenggara
- [ ] **12. Detail acara, alur beli, tiket**: tampilan baru tanpa mengubah logika
- [ ] **13. Admin dan QA visual**: branding admin, thumbnail poster, wizard kategori dan poster, QA 390px dan 1440px, tangkapan layar sebelum dan sesudah

**4. Cadangan database.** Tahap 11 menambah tiga kolom di tabel Event. Kalau Neon-mu punya fitur branch, buat satu branch cadangan sebelum Prompt 11.

**5. Urutan kerja.** Jalankan satu prompt, cek hasilnya di HP dan laptop, lalu `git push` dan pastikan Vercel hijau sebelum lanjut. Jalankan Prompt 10, lalu siapkan poster (lihat `ASSETS.md` bagian 7), baru Prompt 11.

**6. Prioritas waktu.** Pendaftaran lomba tutup 8 November dan yang dinilai pertama adalah link prototype beserta deck. Dua tahap pertama (10 dan 11) memberi perubahan kesan terbesar, jadi kerjakan keduanya dulu. Tahap 12 dan 13 menyusul bila waktu masih ada.

---

## Prompt 10 — Fondasi visual (Tahap 10)

Kerjakan Tahap 10 di `docs/PROGRESS.md`. Baca `AGENTS.md`, lalu `docs/DESIGN_V2.md`, `docs/ASSETS.md`, `docs/DESIGN.md` (bagian yang masih berlaku), dan `docs/skills/frontend-ui.md`. Tahap ini hanya mengubah tampilan. Jangan menyentuh `src/lib/seats.ts`, route API, skema database, atau logika alur beli.

Sebelum menulis kode, ambil tangkapan layar "sebelum" untuk beranda, detail acara, halaman denah, dan halaman tiket di lebar 390px dan 1440px (kalau ada alat browser atau Playwright), simpan di `docs/screenshots/before/`. Lalu tulis rencana singkat: daftar berkas yang akan dibuat atau diubah.

Tugas:
1. **Token desain**: pindahkan warna, radius bertingkat, dan skala tipografi dari `DESIGN_V2.md` bagian 2 ke konfigurasi Tailwind atau variabel CSS, lalu ganti pemakaian warna lama (indigo) di seluruh komponen dengan token baru. Jangan ada hex acak yang tersebar di komponen.
2. **Font**: muat Bricolage Grotesque (700, 800) dan Figtree (400, 500, 600) lewat `next/font/google`, ganti font lama di seluruh aplikasi. Bila salah satu tidak tersedia, pakai Plus Jakarta Sans untuk isi dan catat di `PROGRESS.md`.
3. **Logo**: buat komponen `Logo` (mark dari `public/brand/` ditambah teks "GateIn" sebagai teks sungguhan) dengan varian berwarna dan terbalik serta prop ukuran. Pasang `favicon.svg`, ikon layar utama 180x180, dan `opengraph-image` sesuai `DESIGN_V2.md` bagian 3. Jangan menggambar ulang atau mengubah mark.
4. **Header publik baru**: logo di kiri, kolom pencarian berbentuk pil (belum perlu berfungsi penuh, cukup tampilan dan tersambung ke status di Tahap 11), chip kota "Bandung, Summarecon", dan tombol "Untuk penyelenggara" menggantikan tombol "Panel Panitia". Hapus chip "Summarecon Bandung" di samping logo. Header responsif di 390px: logo dan ikon cari saja, pencarian membuka lapisan penuh.
5. **Footer baru** sesuai `DESIGN_V2.md` bagian 4. Tidak ada logo bank, e-wallet, atau toko aplikasi.
6. **`PosterImage` dan `PosterFallback`**: `PosterImage` memakai `next/image` rasio 16:9 dengan placeholder dan penanganan gambar gagal dimuat. `PosterFallback` membuat poster generatif dari nama dan slug acara (pasangan warna deterministik dari palet GateIn, bentuk geometris dari lengkung dan lingkaran, nama acara dengan Bricolage 800 di kiri bawah). Tidak boleh berupa blok gelap dengan ikon kursi. Siapkan halaman `/dev/poster` untuk melihat fallback dengan sepuluh nama acara berbeda (hanya aktif saat pengembangan).
7. **Komponen dasar**: `Button` (utama, sekunder, teks), `Chip`, `Badge`, `SectionHeader` (judul dan tautan "Lihat semua"), `Skeleton`, dengan gaya sesuai `DESIGN_V2.md`. Tombol utama: latar Gerbang, teks putih, tinggi minimal 48px di HP.
8. **Perbaikan denah**: legenda "Tersedia" memakai kotak tepi tegas berlabel "Tersedia (warna sesuai zona)" dan tidak lagi memakai warna zona pertama. Cincin "Dipilih saya" memakai Tinta dengan ikon centang. Jangan mengubah perilaku `SeatMap`, pan, zoom, atau polling.
9. **Ubah teks tampilan** yang masih berbahasa fitur sesuai tabel di `DESIGN_V2.md` bagian 11 (hilangkan "Pemilihan Kursi 1:1", "Sistem E-Ticketing", dan headline lama di beranda; hero baru dikerjakan di Tahap 11, jadi untuk sementara cukup sembunyikan kartu hero lama).

Ikuti `docs/skills/self-verify.md`. Ambil tangkapan layar "sesudah" ke `docs/screenshots/after-10/`. Laporkan: apa yang berubah, hasil lint dan build, dan hal yang perlu saya cek manual di HP.

---

## Prompt 11 — Beranda marketplace dan data realistis (Tahap 11)

Kerjakan Tahap 11 di `docs/PROGRESS.md`. Baca ulang `docs/DESIGN_V2.md` bagian 4, 5, 10, 11 dan `docs/ASSETS.md`. Poster delapan acara sudah ada di `public/posters/` (periksa; bila ada yang belum ada, `PosterFallback` yang dipakai dan beri tahu saya berkas mana yang kurang).

Tugas:
1. **Skema**: tambahkan `Event.category` (enum seperti di `DESIGN_V2.md` bagian 10, default `COMMUNITY`), `Event.isFeatured` (default `false`), dan `Event.organizerName` (opsional). Migrasi harus aman untuk data yang sudah ada. Perbarui `docs/DATA_MODEL.md`. Beri tahu saya dulu migrasi apa yang akan dijalankan terhadap database Neon yang terhubung sebelum menjalankannya.
2. **Seed**: tambahkan enam acara baru dan lengkapi kategori, unggulan, nama penyelenggara, dan `posterUrl` untuk dua acara lama, mengikuti tabel di `DESIGN_V2.md` bagian 10. Terapkan aturan waktu seed di bagian yang sama: jam bulat WIB yang wajar, tidak ada lagi acara pukul 01.14. Semua kursi SOLD wajib punya order PAID dan tiket, sebagian kecil tiket berstatus USED. Seed tetap idempotent dan acara demo, kursi dan kode tiket di `DEMO_SCRIPT.md` tidak berubah. Seed tidak boleh menghapus acara buatan tangan.
3. **Hero carousel** (acara `isFeatured`), **ikon kategori** dengan filter lewat `?kategori=`, **pencarian** sisi klien (nama, tempat, penyelenggara), **tiga baris acara** ("Sedang ramai di Bandung", "Akhir pekan ini", "Segera habis") yang dihitung dari data nyata, **kartu acara berbentuk karcis**, **strip angka kecil**, **band penjelas** (memakai `SeatMap` mode view pada acara unggulan, tanpa interaksi), **band penyelenggara**, dan footer. Perilaku carousel, geser di HP, dan aturan baris yang kurang dari tiga acara persis seperti di `DESIGN_V2.md` bagian 4. Carousel dibuat dengan CSS scroll-snap dan kode sendiri, tanpa library baru.
4. **Data**: jumlah kursi tersedia dan terjual per acara diambil dengan satu kueri berkelompok, bukan satu kueri per acara. Status efektif kursi tetap mengikuti aturan HELD kedaluwarsa dianggap tersedia.
5. **Wizard admin langkah 1**: tambahkan pilihan Kategori dan isian Nama penyelenggara tampil. Wajibkan nama acara dan tampilkan pesan yang jelas bila kosong.
6. Tampilkan state loading (skeleton), kosong (pesan arahan), dan error yang ramah. Periksa di 390px lebih dulu, baru 1440px.

Ikuti `docs/skills/self-verify.md`. Pastikan skenario `DEMO_SCRIPT.md` nomor 1 sampai 10 dan skrip uji balapan masih lolos. Tangkapan layar ke `docs/screenshots/after-11/`. Laporkan hasilnya, termasuk acara mana yang masih memakai `PosterFallback`.

---

## Prompt 12 — Detail acara, alur beli, tiket (Tahap 12)

Kerjakan Tahap 12 di `docs/PROGRESS.md`. Baca ulang `docs/DESIGN_V2.md` bagian 6, 7, 8. Hanya tampilan: logika hold, bayar, dan tiket tidak boleh berubah.

Tugas:
1. **Detail acara `/e/[slug]`**: latar poster buram dengan poster tajam di depan, tab Deskripsi, Jadwal, Lokasi, Kebijakan, kartu beli yang menempel di desktop dan panel bawah menempel di HP, pratinjau denah asli (mode view) dengan batang ketersediaan per zona, pil status penjualan dengan penjelasan jelas.
2. **Alur beli**: header langkah dengan mini poster, panel bawah menempel, `CountdownBar` baru (berubah menjadi lime bertulisan Tinta saat sisa di bawah 2 menit), pesan "kursi diambil orang lain" sesuai teks di bagian 11.
3. **Ringkasan pesanan dan halaman bayar**: kartu dengan takik karcis, mini poster, rincian kursi, label "Mode simulasi" yang netral.
4. **Halaman pesanan dan tiket**: tampilan karcis sesuai bagian 8, termasuk cap "Sudah digunakan" dengan jam check-in. Gambar hasil "Simpan gambar tiket" ikut gaya karcis.
5. Pastikan di 390px tidak ada scroll horizontal, tombol utama terjangkau, dan denah tetap bisa di-zoom dan dipilih dengan nyaman.

Ikuti `docs/skills/self-verify.md`. Jalankan ulang alur beli lengkap dari beranda sampai tiket QR di lokal, termasuk skenario rebutan kursi (nomor 3 dan 4 di `DEMO_SCRIPT.md`). Tangkapan layar ke `docs/screenshots/after-12/`.

---

## Prompt 13 — Admin dan QA visual (Tahap 13)

Kerjakan Tahap 13 di `docs/PROGRESS.md`. Baca ulang `docs/DESIGN_V2.md` bagian 9, 12, 13.

Tugas:
1. **Branding admin**: komponen `Logo` dengan pil "Panitia", dashboard dengan angka Bricolage dan kartu statistik yang lebih tenang, thumbnail poster di daftar acara, layar hasil scan tetap penuh warna sesuai `DESIGN.md` bagian 5.
2. **Wizard**: unggah poster dengan pratinjau (bila `BLOB_READ_WRITE_TOKEN` belum ada, jangan dikerjakan dan beri tahu saya), dan langkah review menampilkan kartu karcis seperti yang akan dilihat pengunjung.
3. **QA seluruh aplikasi** di 390px dan 1440px: periksa semua halaman publik dan admin dari sudut pandang `DESIGN_V2.md` bagian 12 (larangan) dan 13 (kriteria selesai). Perbaiki yang melanggar. Periksa kontras teks, fokus keyboard yang terlihat, dan `prefers-reduced-motion`.
4. **Performa**: ukuran gambar poster di kartu memakai atribut `sizes` yang benar, hanya slide hero pertama yang `priority`, dan beranda tetap cepat di jaringan HP. Laporkan skor Lighthouse mobile untuk beranda dan detail acara bila alatnya tersedia.
5. **Regresi**: jalankan skenario `DEMO_SCRIPT.md` nomor 1 sampai 10 dan skrip uji balapan sampai semua lolos.
6. Susun `docs/screenshots/` menjadi pasangan sebelum dan sesudah (beranda, detail acara, denah, tiket) di 390px dan 1440px sebagai bahan deck.

Ikuti `docs/skills/self-verify.md`. Berikan daftar langkah uji manual yang harus saya lakukan di HP dan di URL Vercel setelah saya push.

---

## B. Cek manual setelah tiap tahap (untukmu)

- Buka URL Vercel di HP sungguhan, bukan hanya laptop.
- Bandingkan dengan tangkapan layar "sebelum": apakah poster sekarang yang paling menonjol di beranda?
- Coba satu pembelian penuh sampai QR, lalu scan di halaman check-in.
- Hapus atau sembunyikan acara tes yang tidak dipakai di demo (misalnya "lomba mewarnai" dan draft tes) sebelum juri membuka link.