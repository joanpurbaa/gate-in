# PROGRESS

Agent: centang `[x]` setelah tahap lulus `lint` + `build` + verifikasi di `docs/skills/self-verify.md`. Catat keputusan dan masalah terbuka di bawah.

## Tahap

- [x] **0. Orientasi** — baca semua dokumen, rangkum pemahaman (tanpa kode)
- [x] **1. Fondasi**: Prisma + Neon, skema, migrasi, seed dasar, `db.ts`, `.env.example`, nama env final
- [x] **2. Generator layout + SeatMap**: grid & lingkaran, SVG pan/zoom, halaman `/dev/seatmap`, seed 2 layout
- [x] **3. Alur pengunjung bagian 1**: beranda, detail event, data diri, denah pilih kursi, polling status
- [x] **4. Locking kursi + pesanan**: hold atomik, timer, ringkasan, release, pesanan kedaluwarsa
- [x] **5. Pembayaran simulasi + tiket**: bayar sukses/gagal, tiket + QR, halaman pesanan/tiket, kirim WhatsApp Fonnte (non-blocking)
- [x] **6. Admin dasar**: login, dashboard, wizard buat event (template manual), zona & harga, publish
- [x] **7. Check-in + monitoring**: scanner, 3 hasil, denah live hijau, statistik, peserta/transaksi, CSV
- [x] **8. AI layout**: unggah foto + deskripsi → Gemini → preview → koreksi → simpan; fallback manual
- [x] **9. Polish & rilis**: poster (Vercel Blob), state kosong/error, QA HP, README, jalankan DEMO_SCRIPT di Vercel
- [x] **10. Fondasi visual**: token warna dan tipografi, logo, header dan footer, PosterImage dan PosterFallback, perbaikan legenda dan cincin kursi
- [x] **11. Beranda marketplace + data realistis**: kategori, isFeatured, organizerName, seed 8 acara, hero carousel, kategori, pencarian, baris acara, kartu karcis, band penjelas dan penyelenggara
- [ ] **12. Detail acara, alur beli, tiket**: tampilan baru tanpa mengubah logika
- [ ] **13. Admin dan QA visual**: branding admin, thumbnail poster, wizard kategori dan poster, QA 390px dan 1440px, tangkapan layar sebelum dan sesudah

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

- **Tahap 14 (Halaman /docs Panduan Penggunaan & Pembersihan Tautan)**:
  - **Pembersihan Tautan "Keunggulan GateIn"**: Tautan `/#keunggulan-gatein` dihapus murni dari navbar `PublicFooter.tsx`, sementara section `#keunggulan-gatein` di beranda tetap utuh. Tidak ada tautan lain dengan tujuan atau teks tersebut di seluruh kode aplikasi.
  - **Rute Panduan `/docs` Ala Dokumentasi Next.js**:
    - Metadata dilindungi dengan `robots: { index: false, follow: false }` (`noindex, nofollow`), dan tidak tercantum pada sitemap manapun.
    - Zero external links: Tidak ada satu pun tautan menuju `/docs` dari halaman publik maupun admin. Hanya bisa dibuka dengan mengetikkan langsung alamat URL di peramban.
    - Bilah atas tipis dengan logo GateIn yang menautkan kembali ke beranda `/`.
    - Sidebar navigasi kiri sticky dengan input filter pencarian judul bagian secara real-time.
    - Konten tengah dibatasi maksimal lebar 720px (`max-w-[720px]`) dengan tipografi resmi Bricolage Grotesque (judul) dan Figtree (isi).
    - Fitur interaktif tanpa library baru: tombol salin tautan anchor (`#`) pada tiap judul dengan notifikasi visual, kotak catatan `DocsNote` (Tips hijau & Penting amber), daftar urutan langkah bernomor `NumberedSteps`, dan komponen `DocsImage` berbasis `next/image` dengan lightbox modal zoom saat gambar diklik.
    - Bilah kanan "Di Halaman Ini" dengan pelacak gulir aktif `IntersectionObserver` dan dukungan `prefers-reduced-motion`.
    - Pada layar mobile 390px, sidebar menjadi menu drawer slide-over dan terverifikasi `scrollWidth === clientWidth` (0 horizontal overflow).
  - **20 Tangkapan Layar Asli via Playwright**:
    - Diambil mandiri dari aplikasi yang berjalan lokal dengan akun demo `panitia@demo.id` dan data pembeli fiktif "Budi Demo" / `081234567890`.
    - 8 gambar alur pengunjung pada viewport 390px (HP, skala 2x).
    - 12 gambar alur penyelenggara pada viewport 1440px (desktop, skala 2x).
    - Disimpan dalam format WebP terkompresi di `public/docs/` (seluruh berkas berukuran 4,6 KB s.d. 64 KB, jauh di bawah batas 200 KB).
    - Tangkapan layar tampilan `/docs` itu sendiri disimpan di `docs/screenshots/after-14/docs-390.png` dan `docs/screenshots/after-14/docs-1440.png`.
    - Database demo di-reset kembali secara bersih via `node prisma/seed.ts`.
- **Pembersihan Tautan Admin & Pengalaman Publik Siap Produksi**:
  - Seluruh tombol dan tautan yang mengarah ke dashboard atau login admin (`/admin`, `/admin/login`) telah dihapus dari seluruh tampilan pengunjung (`PublicHeader.tsx`, `PublicFooter.tsx`, dan `not-found.tsx`).
  - Header publik kini berfokus murni pada pengalaman pembeli dengan CTA "Jelajahi Acara" yang mengarah mulus ke `#daftar-acara`.
  - Section banner diubah menjadi **Jaminan Keunggulan GateIn (`#keunggulan-gatein`)** berlatar Tinta yang mengedukasi 3 keunggulan utama: Denah Interaktif 1:1, Jaminan Bebas Kursi Ganda (Anti Double Booking), dan E-Ticket Resmi Instan via WhatsApp.
- **Sistem Caching Native Next.js Tanpa Redis (`src/lib/cache.ts`)**:
  - Menggunakan API bawaan `unstable_cache`, `revalidateTag`, dan `revalidatePath` dari Next.js 16:
    - `getCachedMarketplaceData()`: Cache katalog acara publik dan agregasi kursi dengan TTL 60 detik (`tags: ['events', 'marketplace']`).
    - `getCachedEventDetail(slug)`: Cache detail acara dan zona publik dengan TTL 30 detik (`tags: ['events']`).
    - `revalidateEventsCache()`: Pemicu on-demand invalidation instan saat admin membuat (`POST /api/admin/events`) atau mengubah (`PUT /api/admin/events/[id]`) acara.
  - Logika kritis penguncian kursi atomik (`src/lib/seats.ts`) dan polling ketersediaan kursi tetap membaca langsung ke PostgreSQL Neon agar data kursi selalu 100% segar dan bebas double-booking.
- **Verifikasi Integritas Form Checkout & Keterbacaan Analitik**:
  - Isu input fokus pada formulir pemesanan (`CheckoutDrawer.tsx`) terbukti tuntas; fokus tidak lagi terlempar ke kolom nama saat mengetik nomor WhatsApp.
  - Kartu rekomendasi analitik organizer (`AnalyticsClient.tsx`) terkonfirmasi berkontras tinggi dan mudah dibaca pada seluruh kondisi tema.
- **Eksekusi nonstop Tahap 1→9**: atas instruksi eksplisit user, seluruh tahap dikerjakan berurutan dengan commit lokal per tahap (`tahap-N: ...`).
- **Prisma 7.10.1 stabil**: `npm install prisma` tanpa versi menarik `8.0.0-rc.30`; dikunci ke `7.10.1` agar selaras dengan `@prisma/client@7.10.1` dan `@prisma/adapter-neon@7.10.1`.
- **Next.js 16 `cacheComponents`**: dimatikan di `next.config.ts` karena aplikasi ticketing membutuhkan pembacaan status kursi dan pesanan yang selalu segar per request.
- **Schema `neon_auth` bawaan Neon**: dibiarkan tidak tersentuh; semua tabel aplikasi berada di schema `public`.
- **Atomic Seat Locking (`src/lib/seats.ts`)**: menggunakan satu statement CTE `SELECT ... ORDER BY "id" FOR UPDATE` + `UPDATE "Seat"` untuk mencegah race condition sekaligus mencegah deadlock pada pemilihan multi-kursi. Diuji dengan 8 request paralel di `scripts/test-locking.ts`.
- **AI Layout Fallback Kuota Free Tier (`src/lib/ai/layout.ts`)**: membaca `GEMINI_MODEL` dari env (`gemini-2.5-flash`) dan bila terkena limit RPM free tier (`429 RESOURCE_EXHAUSTED`), otomatis melakukan retry 1x ke `gemini-2.5-flash-lite` agar demo tidak gagal. Diuji pada 5 skenario di `scripts/test-ai-layout.ts`.
- **GateIn Sales Performance Analytics (Dashboard Analitik Penyelenggara)**:
  - **Halaman Khusus Analitik (`/admin/analytics`)**:
    - Dashboard visual komprehensif bagi penyelenggara acara untuk memantau performa penjualan, kecepatan transaksi, dan okupansi venue secara mendalam.
    - Dilengkapi selector filter acara, rentang waktu (7 hari, 30 hari, 90 hari, semua), granularitas (harian, mingguan, bulanan), dan toggle perbandingan periode sebelumnya.
  - **Modul Analitik Terintegrasi**:
    - **Modul A (Sales Trend)**: Grafik bar responsif berbasis SVG murni (tanpa library pihak ketiga) dengan metrik Gross Revenue (hanya pesanan `PAID`), tiket terjual, transaksi berhasil, dan persentase perubahan performa vs periode sebelumnya.
    - **Modul B (Sales by Ticket Zone)**: Breakdown tiket terjual, pendapatan, persentase kontribusi kuota/revenue, okupansi per zona, dan visual stacked bar kontribusi zona.
    - **Modul C (Sales Velocity)**: Heatmap distribusi penjualan per jam (00–23 WIB), penjualan per hari dalam seminggu, identifikasi jam & hari puncak transaksi (Peak Velocity), serta tren kecepatan penjualan mendekati Hari H (H-30+ hingga Hari H).
    - **Modul D (Seat Occupancy Analytics)**: Metrik kapasitas venue, kursi tersedia, terjual, dan tertahan (`HELD`), konsisten dengan aturan state `src/lib/seats.ts`.
    - **Modul E (Attendance Analytics)**: Tiket terjual, tiket hadir (`USED`), tiket belum check-in (`VALID`), persentase kehadiran, linimasa kedatangan per jam, dan performa gerbang/gate checker.
    - **Modul F (Actionable Insights)**: Rekomendasi operasional berbasis kalkulasi metrik nyata di server (kecepatan jual, zona terlaris, bottleneck gate, dsb.) tanpa halusinasi AI/Gemini.
  - **Ekspor Data CSV (`/api/admin/analytics/export`)**:
    - Mendukung ekspor 3 format laporan: `sales-summary`, `zone-performance`, dan `attendance`.
    - Dilengkapi sanitasi formula injection (`=`, `+`, `-`, `@`) untuk keamanan file spreadsheet.
  - **Performa & Akses Server-Side**:
    - Seluruh kalkulasi dan agregasi dijalankan di server dengan kueri Prisma teroptimasi tanpa isu $N+1$.
    - Proteksi otorisasi sesi admin dan isolasi kepemilikan acara (`event.organizerId`).
    - Pengujian otomatis `scripts/test-analytics.ts` lulus 100% pada seluruh 8 skenario pengujian.
  - **Peningkatan Kontras Actionable Insights**:
    - Memperbaiki kontras teks kartu rekomendasi dengan membuang kelas `dark:` yang terpicu oleh tema gelap sistem operasi pemakai (sehingga sebelumnya menghasilkan teks warna pastel muda pucat di atas latar putih).
    - Memperbarui gaya kartu dengan judul tebal bergradasi pekat (`text-emerald-950`, `text-amber-950`, `text-indigo-950`), isi pesan berkontras tinggi (`text-emerald-900`, `text-amber-900`, `text-indigo-900`), serta lencana badge tebal kontras tinggi (`bg-emerald-700 text-white`, `bg-amber-700 text-white`, dsb.).
- **GateIn Promotion & Promo Code Manager (Diskon Tiket & Transaksi Terproteksi)**:
  - **Skema Basis Data & Migrasi (`prisma/schema.prisma`)**:
    - Migrasi `20261106200000_add_promotion_and_promo_code` menambahkan enum `DiscountType` (`PERCENTAGE`, `FIXED_AMOUNT`) dan `PromoUsageStatus` (`RESERVED`, `CONFIRMED`, `RELEASED`).
    - Model `Promotion`: kode unik (uppercase), nama, jenis diskon, nilai diskon, batasan maksimal diskon (capping), batas minimum belanja, pembatasan target acara (`eventId`) dan zona (`zoneId`), periode aktif (`startsAt`, `expiresAt`), kuota penggunaan total (`totalQuota`), batas pemakaian per pembeli (`maxUsesPerUser`), dan status aktif (`isActive`).
    - Model `PromoUsage`: pencatatan reservasi penggunaan promo secara atomik yang terikat ke `orderId` dan nomor WhatsApp pembeli (`buyerPhone` ternormalisasi 62xxx).
    - Kolom `Order`: penambahan `originalAmount`, `discountAmount`, `promoId`, dan `promoCode` untuk jejak audit finansial resmi.
  - **Mesin Validasi & Integritas Transaksi (`src/lib/promo/service.ts`, `src/lib/seats.ts`)**:
    - Validasi multi-lapisan di server: pengecekan keberadaan kode promo, status aktif, jendela waktu valid (waktu server), kesesuaian acara, kesesuaian zona tiket, kuota aktif (menghitung `CONFIRMED` + `RESERVED` yang hold-nya belum kedaluwarsa), dan batas penggunaan per pembeli lintas format nomor HP.
    - **Proteksi Concurrency & Anti-Over-Subscribed**: menggunakan `SELECT "id" FROM "Promotion" WHERE "code" = ${cleanCode} FOR UPDATE` di dalam transaksi database atomik untuk memblokir race condition saat banyak pembeli berebut sisa kuota promo terakhir.
    - **Siklus Hidup Kuota Otomatis**: kuota ditahan (`RESERVED`) saat hold kursi, dikonfirmasi (`CONFIRMED`) saat order dibayar, dan otomatis dilepas kembali (`RELEASED`) saat pesanan dibatalkan atau kedaluwarsa (`EXPIRED`).
    - **Integritas Pembayaran Berpromo**: memperbarui verifikasi `confirmOrderSold` agar memvalidasi subtotal pesanan terhadap `order.originalAmount ?? order.totalAmount`, menjamin pesanan dengan diskon promo dapat dikonfirmasi lunas tanpa kesalahan penolakan harga.
  - **Integrasi Alur Checkout Pembeli (`CheckoutDrawer.tsx`, `BookingFlowClient.tsx`)**:
    - Form promo interaktif dengan tombol "Terapkan", validasi server real-time via `/api/promos/validate`, rincian breakdown harga transparan (Subtotal, Diskon Promo, Total Pembayaran), dan pill badge promo yang dapat dilepas dengan 1 klik.
    - Menampilkan informasi promo dan penghematan pada halaman konfirmasi pembayaran (`/bayar/[orderId]`) dan halaman tiket resmi (`/pesanan/[orderId]`).
  - **Modul Manajemen Promosi Penyelenggara (`/admin/promos`)**:
    - Dashboard promo lengkap dengan 4 KPI cards: Total Promo Aktif/Berakhir, Total Penggunaan Tiket, Total Diskon Diberikan, dan Total Penjualan Didapat (GMV order berpromo).
    - Filter pencarian kode/nama, filter status promo (Semua, Aktif, Kuota Habis, Berakhir, Nonaktif), quick toggle status aktif, dialog konfirmasi hapus aman (promo yang sudah memiliki riwayat penggunaan dinonaktifkan otomatis demi integritas data).
    - Modal formulir pembuatan & pengeditan kode promo dengan validasi interaktif.
  - **Pengujian Otomatis Menyeluruh (`scripts/test-promo.ts`)**:
    - Lolos 100% pada seluruh 15 skenario pengujian: promo persentase, potongan tetap (fixed amount), capping diskon maksimal, kode salah/tidak ada, promo nonaktif, promo belum mulai, promo kedaluwarsa, kuota habis, minimum belanja belum tercapai, event mismatch, zone mismatch, batas penggunaan per WhatsApp, penguncian konkurensi (race condition), pelepasan otomatis kuota saat order kedaluwarsa, serta konfirmasi pembayaran dan kalkulasi analitik organizer.
    - Seluruh pengujian regresi (`test-analytics.ts`, `test-waiting-list.ts`, `test-locking.ts`) terverifikasi tetap lulus 100%.
- **Perbaikan Input Focus pada CheckoutDrawer**:
  - Dikonfirmasi dan diuji via headless Chrome: input nama dan nomor telepon di `CheckoutDrawer.tsx` menggunakan controlled state tanpa `autoFocus`, serta dilengkapi atribut `name` dan `autoComplete` standar (`name="buyerName"` `autoComplete="name"`, `name="buyerPhone"` `autoComplete="tel"`).
  - Pengetikan nomor telepon (misal `082...`) mempertahankan fokus sepenuhnya pada kolom nomor WhatsApp tanpa terlempar kembali ke kolom nama.
- **GateIn Smart Waiting List (Sistem Antrean Cerdas & Penawaran Tiket)**:
  - **Skema Database & Migrasi**:
    - Migrasi `20261106130000_add_smart_waiting_list` sukses menambahkan enum `WaitingListStatus` (`WAITING`, `OFFERED`, `CONVERTED`, `EXPIRED`, `CANCELLED`) dan tabel `WaitingListEntry` terhubung relasi dengan `Event` dan `Zone`.
    - Token unik 48 karakter heksadesimal kriptografis (`randomBytes(24).toString("hex")`) aman dan unguessable.
    - Aturan integritas: pencegahan duplikasi entri aktif (`WAITING` atau `OFFERED`) untuk nomor WhatsApp pemesan yang sama pada acara dan zona yang sama.
  - **Engine Matching & Urutan FIFO**:
    - Modul `src/lib/waiting-list/matcher.ts` mengelola alokasi kuota secara berurutan berdasarkan waktu pendaftaran (FIFO `createdAt ASC`).
    - Aturan Kuota Utuh: Pembeli yang meminta $Q$ kursi tidak akan diberi alokasi parsial (tetap berstatus `WAITING`) hingga kursi efektif pada zona tersebut $\ge Q$.
    - Perhitungan kuota efektif memperhitungkan kursi yang sedang berstatus penawaran aktif (`OFFERED` dan belum kedaluwarsa) untuk mencegah satu kursi ditawarkan ke banyak orang sekaligus.
    - Otomatisasi Pelepasan: `sweepExpiredOffers` memeriksa penawaran yang melewati `offerExpiresAt` (default 15 menit), mengubah status menjadi `EXPIRED`, dan secara otomatis meneruskan penawaran ke kandidat antrean berikutnya.
    - Terintegrasi langsung dengan event pelepasan kursi di `src/lib/events/seat-events.ts` (`subscribeToSeatsReleased`) serta Vercel Cron `/api/cron/expire-orders`.
  - **Alur Pembeli & Halaman Interaktif**:
    - Modal pendaftaran `WaitingListModal.tsx` aktif di `/e/[slug]` saat tiket sold out atau saat zona pilihan habis terjual.
    - Halaman pemantauan status `/waiting-list/[token]` menampilkan posisi antrean FIFO real-time (`#X di Zona Y`), detail permintaan, dan opsi pembatalan mandiri.
    - Halaman penawaran khusus `/offer/[token]` dilengkapi timer hitung mundur 15 menit, rincian kuota eksklusif, serta tombol "Pilih Kursi & Pesan Sekarang".
    - Halaman pemesanan `/e/[slug]/beli?offer=[token]` mengizinkan pemegang penawaran aktif mengakses denah dan memilih kursi bahkan saat penjualan umum telah sold out.
    - Validasi token penawaran pada `POST /api/orders` menjamin konversi atomik (`CONVERTED`), mencocokkan zona dan jumlah tiket, serta mencegah penggunaan token ganda.
  - **Dashboard Penyelenggara**:
    - Tab baru "Smart Waiting List" pada monitor acara `/admin/events/[id]` menampilkan ringkasan 4 metrik status (Menunggu, Penawaran Aktif, Dikonversi, Kedaluwarsa/Batal), tabel ringkasan kebutuhan per zona, serta tabel antrean kandidat FIFO lengkap dengan status notifikasi dan tautan penawaran.
  - **Notifikasi WhatsApp**:
    - Fungsi `sendWaitingListOfferWhatsApp` di `src/lib/wa.ts` mengirim tautan penawaran instan ke WhatsApp pemesan secara non-blocking via Fonnte.
  - **Pengujian**: Seluruh 10 skenario pengujian di `scripts/test-waiting-list.ts` lulus 100%, dan regresi `test-locking.ts`, `test-expired-recovery.ts` lulus 100%.
- **GateIn Automatic Expired Order Recovery**:
  - **Skema & Migrasi**: Menambahkan `expiredAt` (DateTime), `expiredNotifiedAt` (DateTime), dan index `(status, holdExpiresAt)` pada tabel `Order` melalui migrasi `20261106120000_add_order_expiration_fields`.
  - **Expiration Engine (`src/lib/seats.ts`)**:
    - Fungsi `expireStaleOrders` mengeksekusi scanning pesanan `PENDING` yang melewati `holdExpiresAt` dengan `SELECT ... FOR UPDATE SKIP LOCKED` sehingga aman dijalankan oleh multiple concurrent jobs tanpa deadlock atau double-processing.
    - Mengembalikan kursi ke status `AVAILABLE` (mengosongkan `heldUntil`, `holdToken`, dan `orderId`) dan menandai order `EXPIRED` dengan timestamp `expiredAt`.
  - **Integritas Pembayaran & Concurrency**:
    - `confirmOrderSold` memvalidasi `holdExpiresAt` terhadap waktu server. Pembayaran yang tiba setelah kedaluwarsa secara atomik ditolak (`ORDER_EXPIRED`), status disimpan ke database, dan kursi dilepas kembali ke denah.
    - Idempotent: Order yang sudah `PAID` dijamin tidak dapat di-expire.
  - **Job Processing & Deployment**:
    - `vercel.json` dikonfigurasi dengan Vercel Cron untuk menjalankan `/api/cron/expire-orders` setiap menit.
    - `/api/cron/expire-orders` mendukung otentikasi via `CRON_SECRET` Vercel.
    - Polling denah `/api/events/[slug]/seats` mengeksekusi lazy/opportunistic background recovery non-blocking, menjamin pembersihan bahkan sebelum cron periodik berjalan.
  - **Notifikasi Pembeli & Waiting List Hook**:
    - Notifikasi WhatsApp otomatis dikirim via Fonnte (`sendOrderExpiredWhatsApp`), non-blocking dan dilindungi `expiredNotifiedAt` agar tidak ada notifikasi berulang.
    - Modul event internal `src/lib/events/seat-events.ts` memancarkan `dispatchSeatsReleased` untuk integrasi modul waiting list di masa mendatang tanpa alokasi sepihak.
  - **Pengujian**: Seluruh 7 skenario pengujian di `scripts/test-expired-recovery.ts` lulus 100%, dan regresi `test-locking.ts`, `test-checkin.ts`, serta `verify-e2e.ts` lulus 100%.
- **GateIn Express Booking (Alur Pemilihan Kursi Terintegrasi)**:
  - Mengubah alur pembelian tiket dari model 3 langkah berjenjang menjadi model **Express Booking**:
    1. Pengunjung masuk ke `/e/[slug]/beli` langsung melihat denah kursi interaktif (`SeatMap`) tanpa form pemesan awal.
    2. Pemilihan kursi multi-tiket (hingga batas `maxSeatsPerOrder`) diperbarui secara real-time pada bar bawah (`SelectedSeatsBar`).
    3. Integrated Checkout Drawer (`CheckoutDrawer.tsx`) terintegrasi langsung di atas denah (bottom sheet di mobile, modal dialog di desktop) untuk memasukkan Nama Pemesan dan Nomor WhatsApp aktif (validasi format nomor Indonesia).
    4. Konfirmasi checkout langsung memicu reservasi atomik server via `POST /api/orders` (`holdSeatsAndCreateOrder` dengan PostgreSQL `SELECT ... FOR UPDATE`).
    5. Jika berhasil (HTTP 201), pembeli langsung di-redirect ke halaman pembayaran `/bayar/[orderId]` tanpa redundansi langkah ringkasan perantara.
    6. Jika terjadi bentrok kursi (HTTP 409 `SEATS_TAKEN`), pembeli menerima feedback jelas, kursi yang bentrok otomatis dikeluarkan dari seleksi, dan denah kursi disinkronkan secara otomatis.
    7. Seluruh skrip uji (`test-locking.ts`, `test-checkin.ts`, `verify-e2e.ts`) lulus 100%.
- **Tahap 11 (Beranda Marketplace & Data Realistis)**:
  - Skema database: migrasi `20261106091032_add_event_category_and_featured` sukses menambahkan `EventCategory` (MUSIC, TECH, ARTS, EDUCATION, COMMUNITY, SPORTS), kolom `category` (default `COMMUNITY`), `isFeatured` (default `false`), dan `organizerName` (opsional).
  - Seed 8 acara realistis Summarecon Mall Bandung sukses dijalankan idempotent dengan waktu bulat WIB wajar (09.00, 10.00, 13.00, 15.00, 16.00, 19.00, 19.30 WIB). Seluruh kursi SOLD memiliki pesanan PAID dan tiket VALID/USED. Tiket demo `DEMO000VLD` (C-8), `DEMO000USD` (C-9), dan kursi uji balapan `E-5`, `E-6`, `E-7` tetap utuh.
  - Performa agregasi kursi: dihitung dengan satu kueri agregasi SQL berkelompok (`GROUP BY "eventId"`), menggantikan pengambilan ratusan objek kursi ke memori.
  - UI Beranda Marketplace:
    - `HeroCarousel`: scroll-snap CSS tanpa library luar, 16:7 desktop dengan 8% peek tetangga, 4:5 swipe di mobile, auto-advance 6 detik dengan pause hover/touch.
    - `CategoryBar`: 6 ikon kategori SVG bulat 64px di latar Gerbang 8% dengan state sinkron ke URL `?kategori=`.
    - Pencarian klien: terhubung dengan search input header pil, mencari berdasarkan nama acara, tempat, dan penyelenggara dengan state kosong yang ramah.
    - 3 Baris Acara Data Nyata: "Sedang ramai di Bandung", "Akhir pekan ini", dan "Segera habis" (sisa < 25%). Baris disembunyikan otomatis jika acara yang memenuhi syarat < 3.
    - `EventCard`: format karcis dengan lencana tanggal besar, pil kategori, penyelenggara, venue, harga mulai dari, dan takik setengah lingkaran bergaris putus-putus.
    - `ExplainerBand`: band denah nyata 1:1 "Lihat kursimu sebelum bayar" dengan SeatMap mode view dari acara unggulan.
    - `OrganizerBand`: band ajakan penyelenggara berlatar Tinta.
  - Wizard Admin: langkah 1 dilengkapi pilihan Kategori, isian Nama Penyelenggara publik, dan validasi nama acara wajib diisi.
  - Tangkapan layar tersimpan di `docs/screenshots/after-11/` (scrollWidth 390px dan 1440px tanpa overflow horizontal).
  - Status berkas poster: seluruh 8 poster WebP resmi 16:9 (1600x900) telah dibuat via generator ilustrasi sesuai panduan `docs/ASSETS.md` dan disimpan di `public/posters/` (ukuran optimal 32–103 KB). Seluruh 404 pada gambar poster telah teratasi penuh.
- **Tahap 10 (Fondasi Visual)**:
  - Token warna, tiered radius (`20px` kartu, `14px` tombol, `12px` input), dan skala tipografi (12–56px) diterapkan di `src/app/globals.css` dan diekspos ke TS di `src/lib/design-tokens.ts`. Semua token indigo lama digantikan Gerbang (`#E14D2A`), Batu (`#1C1917`), Tinta (`#0F172A`), dll.
  - Font Bricolage Grotesque (700, 800) dan Figtree (400, 500, 600) dimuat via `next/font/google`.
  - Aset brand mandiri dibuat di `public/brand/` (`gatein-mark.svg`, `gatein-mark-reversed.svg`, `gatein-mark-mono.svg`, `favicon.svg`), komponen `Logo` menggabungkan mark + teks "GateIn".
  - Dynamic `apple-icon.tsx` (180x180) dan `opengraph-image.tsx` (1200x630) menggunakan `ImageResponse`.
  - Header publik baru dengan search bar pil (overlay full-screen di 390px), chip "Bandung, Summarecon", dan tombol "Untuk penyelenggara".
  - Komponen dasar baru: `Button`, `Chip`, `Badge`, `SectionHeader`, `Skeleton`, `PosterFallback`, `PosterImage`, `PublicFooter`. Halaman playground dev `/dev/poster` aktif untuk menguji 10 variasi fallback.
  - Denah kursi: legenda "Tersedia (warna sesuai zona)" berbingkai tegas; seleksi "Dipilih saya" memakai warna Tinta dan ikon centang.
  - Build produksi distandarkan menggunakan `next build --webpack` untuk memastikan keandalan kompilasi.
  - Tangkapan layar tersimpan di `docs/screenshots/before/` dan `docs/screenshots/after-10/`.
- **Uji Kirim WhatsApp Fonnte**: telah diuji langsung ke nomor `082275338090` (`6282275338090`) dengan hasil `{ status: 'SENT' }` dan kode tiket `YM6D542KNM` (kursi `A-10` VIP) yang tetap aktif (`VALID`) di database bersama tiket seed `DEMO000VLD` (`VALID`) dan `DEMO000USD` (`USED`).

## Masalah Terbuka

- Pastikan `GEMINI_MODEL=gemini-2.5-flash` dan `AUTH_SECRET` ditambahkan di Environment Variables Vercel saat push.

## Saran (tidak dikerjakan)

- Pembersihan otomatis order `EXPIRED` lama lewat cron mingguan (tidak diperlukan untuk MVP karena status efektif dihitung saat query).
