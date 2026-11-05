# PROMPTS — Prompt per Tahap untuk opencode (model Gemini)

## Cara pakai

1. Taruh semua file md sesuai struktur (lihat daftar di akhir file ini), commit, lalu push.
2. Buka opencode di root repo. `AGENTS.md` di root dibaca otomatis; bila ternyata tidak, awali prompt pertama dengan "baca AGENTS.md".
3. **Satu prompt = satu sesi kerja.** Tempel prompt, tunggu laporan, cek manual, `git push`, cek deploy Vercel, baru lanjut.
4. Kalau agent melenceng, jangan lanjut ke prompt berikutnya. Koreksi dulu di tahap yang sama ("kamu melanggar aturan X di AGENTS.md, perbaiki").
5. Urutan tahap sama dengan `docs/PROGRESS.md`. Jangan melompat.
6. Bila tiba di tahap 8 dan waktu mepet, tahap itu boleh ditunda; tahap 9 tetap dikerjakan lebih dulu (jalur manual sudah cukup untuk demo).

Sebelum Tahap 8: pastikan `GEMINI_API_KEY` dan **`GEMINI_MODEL`** (nama model yang kamu pakai) ada di `.env.local` dan Vercel.

---

## Prompt 0 — Orientasi (tanpa kode)

Baca `AGENTS.md` dan semua dokumen di folder `docs/` secara berurutan sesuai AGENTS.md. Lalu periksa kondisi repo saat ini: struktur folder, `package.json` (versi Next.js, Tailwind, library yang sudah ada), konfigurasi, dan file `.env*` (cukup sebutkan nama variabelnya, jangan tampilkan nilainya).

Jangan menulis kode, jangan menginstal apa pun, jangan mengubah file apa pun. Beri saya laporan berisi:
1. Ringkasan pemahamanmu tentang produk, dua peran, dan alur utama dalam maksimal 10 baris
2. Pemahamanmu tentang aturan locking kursi dan check-in tiga hasil, dengan kata-katamu sendiri
3. Kondisi repo saat ini dan apa yang sudah ada versus yang belum
4. Lima hal paling berisiko menurutmu dan rencana mitigasinya
5. Pertanyaan atau bagian dokumen yang ambigu atau saling bertentangan (kalau tidak ada, bilang tidak ada)

---

## Prompt 1 — Fondasi (Tahap 1)

Kerjakan Tahap 1 di `docs/PROGRESS.md`: fondasi proyek.

Tugas:
- Periksa dulu apakah database Neon yang terhubung kosong. Jika sudah ada tabel lain, berhenti dan tanya saya sebelum melakukan apa pun.
- Instal dan konfigurasi Prisma untuk Neon (adapter serverless) mengikuti dokumentasi resmi versi terbaru. Pastikan `prisma generate` berjalan otomatis saat build di Vercel.
- Buat skema Prisma persis sesuai `docs/DATA_MODEL.md` (Organizer, Event, Zone, Seat, Order, Ticket, enum status, index, constraint unik termasuk `Ticket.seatId` dan `Ticket.code`).
- Jalankan migrasi ke Neon.
- Buat `src/lib/db.ts` (satu instance Prisma yang aman untuk serverless dan hot reload), `src/lib/money.ts` (format Rupiah), `src/lib/time.ts` (format WIB).
- Buat seed dasar yang idempotent: dua akun penyelenggara sesuai `docs/DEMO_SCRIPT.md` (kata sandi di-hash dengan bcrypt). Event dan kursi menyusul di tahap berikutnya.
- Buat rute sederhana `/api/health` yang mengecek koneksi database.
- Buat `.env.example`. Cocokkan nama variabel dengan yang sudah ada di environment saya. Jika berbeda, sesuaikan kode, bukan meminta saya mengubah env. Tulis kontrak env final di `docs/PROGRESS.md`.
- Sertakan skrip npm untuk migrasi dan seed, dan jelaskan cara menjalankannya.

Ikuti `docs/skills/self-verify.md`. Beri tahu saya env apa saja yang perlu saya tambahkan di Vercel (jika ada) sebelum saya push.

---

## Prompt 2 — Generator layout dan SeatMap (Tahap 2)

Kerjakan Tahap 2 di `docs/PROGRESS.md`. Baca ulang `docs/SEAT_LAYOUT_SPEC.md` dan `docs/skills/frontend-ui.md`.

Tugas:
- Implementasikan tipe layout, validasi (batas 1.500 kursi, batas baris/kolom), generator **grid** dan generator **lingkaran** di `src/lib/layout/`. Hasilnya deterministik: parameter yang sama selalu menghasilkan koordinat dan label yang sama. Dukung `removedLabels`.
- Buat satu fungsi yang mengubah layout menjadi daftar kursi (label, rowLabel, number, x, y, rotation) siap simpan.
- Buat komponen `SeatMap` (SVG, pan, zoom dengan pinch dan tombol, tiga mode, tooltip kursi, legenda, status sesuai `docs/DESIGN.md` dengan ikon/pola, bukan hanya warna). Performa harus lancar untuk 1.500 kursi.
- Buat halaman `/dev/seatmap` untuk menguji: pilih layout grid atau lingkaran, ubah parameter, simulasikan status kursi acak (tersedia, ditahan, terjual, hadir). Halaman ini hanya untuk pengembangan dan harus tidak aktif di produksi.
- Perluas seed sesuai `docs/DEMO_SCRIPT.md`: Event 1 (grid 15x20, zona VIP dan Reguler), Event 2 (lingkaran 3 ring, 2 lorong), kursi SOLD tersebar, satu kursi HELD yang masih berlaku, dan tiket demo `DEMO000VLD` dan `DEMO000USD`. Setiap kursi SOLD harus punya order PAID dan tiket agar data konsisten. Seed harus idempotent.
- Buktikan: grid 15x20 menghasilkan tepat 300 kursi dan lingkaran menghasilkan tepat 96 kursi, label unik, dan generator tidak menghasilkan kursi yang saling menumpuk. Tulis tes atau skrip pemeriksaan sederhana dan jalankan.

Ikuti `docs/skills/self-verify.md`.

---

## Prompt 3 — Alur pengunjung bagian 1 (Tahap 3)

Kerjakan Tahap 3 di `docs/PROGRESS.md`. Baca `docs/PRD.md` bagian alur pengunjung dan `docs/DESIGN.md`.

Tugas:
- Beranda `/` yang menampilkan event published, halaman detail `/e/[slug]` (poster atau placeholder, deskripsi, tanggal dan jam WIB, tempat, jam open gate, rentang harga, status penjualan `StatusPill`: belum dibuka, dibuka, ditutup, sold out; tombol Beli Tiket aktif hanya saat penjualan dibuka).
- Halaman `/e/[slug]/beli`: langkah 1 isi nama dan nomor WhatsApp (validasi, normalisasi ke format 62), langkah 2 denah pemilihan kursi dengan `SeatMap` mode select, legenda zona dan harga, batas jumlah kursi per pesanan sesuai pengaturan event, bar bawah menempel berisi kursi terpilih, total harga, dan tombol Lanjut.
- Rute `GET /api/events/[slug]/seats` mengembalikan status efektif kursi (HELD yang sudah kedaluwarsa dihitung tersedia). Denah memuat ulang lewat polling tiap 5 detik tanpa mengganggu pilihan pengguna dan tanpa render ulang berlebihan.
- Semua state loading, kosong, dan error harus ada. Mobile-first.
- Tombol Lanjut belum perlu membuat pesanan (itu Tahap 4). Untuk sekarang cukup mengarah ke placeholder yang jelas.

Ikuti `docs/skills/self-verify.md`, termasuk pengecekan tampilan di lebar 390px.

---

## Prompt 4 — Locking kursi dan pesanan (Tahap 4)

Kerjakan Tahap 4 di `docs/PROGRESS.md`. Ini tahap paling kritis. Baca ulang `docs/DATA_MODEL.md` bagian 3 dengan teliti.

Tugas:
- Implementasikan `src/lib/seats.ts`: hold atomik, release, dan confirm sold persis sesuai `docs/DATA_MODEL.md` (satu pernyataan atomik untuk semua kursi, rollback penuh bila ada satu kursi yang gagal, kembalikan error `SEATS_TAKEN` beserta label kursi yang gagal). Tidak boleh memakai pola baca dulu lalu tulis. Hanya file ini yang boleh mengubah status kursi.
- Rute `POST /api/orders`: validasi dengan zod, hitung harga dan total di server dari database, patuhi batas kursi per pesanan dan jendela penjualan, buat pesanan PENDING dengan hold 10 menit.
- Rute release untuk melepas hold, dan penanganan pesanan kedaluwarsa saat diakses (tanpa cron).
- Halaman ringkasan pesanan dengan `CountdownBar` yang jelas, daftar kursi, zona, harga, total, status pemesanan, tombol lanjut bayar (pembayaran belum dibuat; arahkan ke halaman bayar placeholder), dan tombol batalkan.
- Di halaman denah: tangani `SEATS_TAKEN` dengan toast, muat ulang denah, kursi yang diambil orang lain tampil amber atau abu-abu.
- Tulis skrip uji balapan di folder `scripts/`: beberapa permintaan paralel untuk kursi yang sama (tepat satu berhasil), pesanan multi-kursi dengan satu kursi bentrok (tidak ada kursi yang tertahan), dan hold kedaluwarsa yang bisa diambil orang lain. Jalankan dan tampilkan hasilnya kepada saya.

Ikuti `docs/skills/self-verify.md` bagian locking.

---

## Prompt 5 — Pembayaran simulasi dan tiket (Tahap 5)

Kerjakan Tahap 5 di `docs/PROGRESS.md`.

Tugas:
- Halaman `/bayar/[orderId]` dengan ringkasan dan hitung mundur, dua tombol: Simulasikan berhasil dan Simulasikan gagal. Tidak ada input kartu atau rekening. Beri label jelas bahwa ini simulasi.
- Rute pay: berhasil → confirm sold atomik, order PAID, buat satu Ticket per kursi dengan kode acak kriptografis 10 karakter tanpa karakter membingungkan (aturan di `docs/DATA_MODEL.md`), kunci layout. Gagal → release kursi, order FAILED. Tangani pesanan kedaluwarsa dan token hold yang sudah berganti dengan pesan yang jelas. Aksi ini harus aman bila tombol ditekan dua kali.
- Halaman `/pesanan/[orderId]` (semua tiket pesanan) dan `/tiket/[code]` (QR besar yang isinya hanya kode tiket, kode, nama event, kursi, zona, jam open gate, nama pemilik). Sertakan cara menyimpan tiket sebagai gambar bila mudah dilakukan tanpa library baru; kalau perlu library baru, minta izin dulu.
- `src/lib/wa.ts`: kirim tiket lewat Fonnte setelah pembayaran berhasil, berisi nama event, kode tiket, kursi, jam open gate, dan tautan tiket. Tidak boleh memblokir atau menggagalkan pesanan. Catat hasilnya di `waStatus` (SENT, FAILED, SKIPPED bila token kosong). Jangan kirim pesan ke nomor sungguhan saat pengujian kecuali saya memberi nomor uji.
- Pastikan seed demo tetap berfungsi dan halaman `/tiket/DEMO000VLD` menampilkan QR yang bisa discan.

Ikuti `docs/skills/self-verify.md`. Jalankan alur lengkap dari beranda sampai tiket dan laporkan hasilnya.

---

## Prompt 6 — Admin dasar (Tahap 6)

Kerjakan Tahap 6 di `docs/PROGRESS.md`. Baca `docs/PRD.md` bagian alur penyelenggara dan `docs/SEAT_LAYOUT_SPEC.md` bagian 5.

Tugas:
- Login penyelenggara di `/admin/login` (bcrypt, sesi cookie bertanda tangan dengan `jose`, httpOnly, secure di produksi, logout). Lindungi semua halaman dan rute `/admin` dan `/api/admin`, dan cek kepemilikan event pada setiap akses.
- Dashboard `/admin` berisi daftar event dengan angka ringkas (terjual, sisa, pendapatan, status).
- Wizard `/admin/events/new` dengan stepper: (a) info dasar semua kolom di PRD, termasuk tanggal buka dan tutup penjualan, (b) layout kursi **dengan template manual dulu** (pilih grid atau lingkaran, isi parameter, preview langsung dengan `SeatMap` mode edit, klik kursi untuk hapus atau pulihkan), (c) zona dan harga (pilih cepat per baris atau ring, pilih klik beberapa kursi, nama, warna dari palet, harga, penghitung kursi tanpa zona), (d) review dan publish. Draft bisa disimpan dan dilanjutkan.
- Validasi publish: semua kursi harus punya zona, jadwal masuk akal (tutup penjualan sebelum acara, open gate sebelum acara selesai), minimal satu kursi.
- Simpan layout ke `Event.layout` dan buat baris `Seat`. Patuhi `layoutLocked`: layout tidak bisa diubah bila sudah ada kursi ditahan atau terjual.
- Halaman edit event untuk info dasar, zona, dan harga.
- Siapkan titik sambung di langkah layout untuk tombol Buat dengan AI (Tahap 8), dinonaktifkan dengan label "segera hadir".

Ikuti `docs/skills/self-verify.md`. Uji sebagai penyelenggara: buat event baru lengkap dari nol sampai publish, lalu beli tiketnya sebagai pengunjung.

---

## Prompt 7 — Check-in dan monitoring (Tahap 7)

Kerjakan Tahap 7 di `docs/PROGRESS.md`. Baca ulang `docs/DATA_MODEL.md` bagian 5 dan `docs/DESIGN.md` bagian 5 dan 6.

Tugas:
- Rute check-in atomik dengan tiga hasil: VALID, SUDAH DIGUNAKAN (sertakan jam check-in pertama), TIDAK VALID (kode tidak ada atau milik event lain). Tiket valid di luar jam open gate tetap diproses dengan peringatan. Wajib login penyelenggara dan cek kepemilikan event.
- Halaman `/admin/events/[id]/checkin` yang nyaman di HP: scanner kamera di browser (satu library scanner yang diizinkan), input kode manual sebagai cadangan, panel hasil layar penuh berwarna selama sekitar 3 detik lalu kembali ke mode scan. Tangani izin kamera ditolak dengan pesan yang jelas.
- Denah live di halaman check-in dan di detail event: tersedia, ditahan, terjual, dan **hadir berwarna hijau**, polling tiap 3 detik lewat rute live. Kursi berubah hijau segera setelah check-in berhasil.
- Detail event `/admin/events/[id]`: kartu statistik (terjual, hadir, sisa, pendapatan), denah live, tab transaksi dan tab peserta (cari, filter status), tombol Unduh CSV untuk peserta dan transaksi (nilai CSV harus aman dari injeksi rumus spreadsheet).
- Uji ketiga hasil dengan kode demo `DEMO000VLD`, `DEMO000USD`, dan `ZZZZ999999`, termasuk scan dua kali pada tiket yang sama dan dua permintaan check-in paralel pada tiket valid (tepat satu yang VALID).

Ikuti `docs/skills/self-verify.md`.

---

## Prompt 8 — AI layout (Tahap 8)

Kerjakan Tahap 8 di `docs/PROGRESS.md`. Baca ulang `docs/SEAT_LAYOUT_SPEC.md` bagian 1 sampai 5. Prinsip utama: AI hanya menghasilkan parameter terstruktur, bukan koordinat.

Pertama, pastikan `GEMINI_API_KEY` dan `GEMINI_MODEL` tersedia di environment. Jika `GEMINI_MODEL` belum ada, berhenti dan beri tahu saya.

Tugas:
- `src/lib/ai/layout.ts`: panggil Gemini lewat SDK resmi (cek dokumentasi terbaru) dengan foto opsional dan deskripsi teks, minta keluaran JSON terstruktur sesuai skema di spesifikasi, suhu rendah, divalidasi dengan zod, satu kali retry bila tidak valid, timeout sekitar 25 detik. Prompt sistem harus menegaskan: angka dari teks penyelenggara adalah sumber kebenaran, jangan mengarang angka, tambahkan peringatan bila memperkirakan dari foto, kembalikan `unsupported` untuk bentuk di luar grid dan lingkaran.
- Rute `POST /api/admin/layout/analyze` (login wajib, batas ukuran foto sekitar 4 MB, foto tidak ditulis ke disk, atur `maxDuration` sesuai batas Vercel yang berlaku menurut dokumentasi).
- Di wizard langkah layout: unggah foto (kompres di sisi klien bila perlu) dan deskripsi, tombol Buat dengan AI dengan indikator loading, tampilkan `warnings` dan `questions`, hasilnya masuk ke preview dan editor koreksi yang sudah ada dari Tahap 6. Penyelenggara harus menyetujui sebelum disimpan.
- Bila AI gagal, lambat, atau mengembalikan `unsupported`: tampilkan pesan ramah dan otomatis beralih ke template manual dengan nilai awal sebisanya. Jalur manual tetap utuh.
- Uji dengan minimal lima deskripsi: grid biasa, grid dengan lorong, lingkaran dengan panggung di tengah, deskripsi yang kekurangan angka, dan bentuk yang tidak didukung. Laporkan hasil masing-masing apa adanya, termasuk yang gagal atau tidak akurat. Jangan menyetel prompt hanya agar kelima contoh lolos tanpa memberi tahu saya.

Ikuti `docs/skills/self-verify.md`.

---

## Prompt 9 — Polish dan rilis (Tahap 9)

Kerjakan Tahap 9 di `docs/PROGRESS.md`.

Tugas:
- Poster event lewat Vercel Blob (unggah dari wizard dan halaman edit, validasi tipe dan ukuran, tampil di beranda dan detail). Bila `BLOB_READ_WRITE_TOKEN` belum ada, berhenti dan beri tahu saya cara membuatnya.
- Telusuri semua halaman: state loading, kosong, error, teks Indonesia konsisten, tidak ada scroll horizontal di 390px, tombol utama mudah dijangkau.
- Uji performa denah dengan layout 1.500 kursi (pan, zoom, polling) dan perbaiki bila patah-patah.
- Audit keamanan berdasarkan "Aturan keras" di `AGENTS.md`: harga dihitung di server, semua rute admin cek sesi dan kepemilikan, validasi zod di semua input, tidak ada rahasia yang bocor ke klien, tidak ada tulis disk saat runtime, halaman `/dev/*` tidak aktif di produksi. Laporkan temuan dan perbaiki.
- Skrip reset demo (`npm run seed` atau yang setara) yang aman dijalankan ulang dan mengembalikan data demo ke kondisi awal. Pastikan skrip menolak berjalan terhadap database yang bukan database demo bila ada cara yang wajar untuk membedakannya, atau minta konfirmasi eksplisit.
- Tulis `README.md`: ringkasan produk, stack, cara menjalankan lokal, daftar env, cara reset seed, akun demo, ringkasan arsitektur locking kursi dan AI layout.
- Jalankan seluruh skenario di `docs/DEMO_SCRIPT.md` secara berurutan terhadap versi lokal dan laporkan hasil tiap langkah. Beri saya daftar langkah yang harus saya uji manual di HP dan di URL Vercel setelah saya push.

Ikuti `docs/skills/self-verify.md`.

---

## Letak file di repo

```
AGENTS.md                      (root repo)
docs/PRD.md
docs/DATA_MODEL.md
docs/SEAT_LAYOUT_SPEC.md
docs/DESIGN.md
docs/PROGRESS.md
docs/DEMO_SCRIPT.md
docs/PROMPTS.md                (file ini, untuk kamu; agent tidak perlu membacanya)
docs/skills/frontend-ui.md
docs/skills/self-verify.md
```