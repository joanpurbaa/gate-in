# Skill: Frontend UI

Panduan wajib saat membuat/mengubah komponen atau halaman. Sumber kebenaran visual: `docs/DESIGN.md`. File ini berisi *cara kerja*.

## 1. Prinsip

1. **Mobile-first**: tulis kelas Tailwind untuk 390px dulu, baru `sm:`/`md:`/`lg:` untuk layar besar. Halaman publik dan check-in harus nyaman dipakai satu tangan.
2. **Denah kursi adalah bintang utama.** Setiap keputusan layout halaman beli harus memberi ruang maksimal ke `SeatMap` + legenda + bar bawah.
3. **Status tidak hanya warna**: tersedia (warna zona), ditahan (amber + garis diagonal), terjual (abu-abu + silang), dipilih (cincin indigo + centang), hadir (hijau + centang). Gunakan `<pattern>` SVG dan ikon kecil.
4. **Tidak ada tampilan template generik**: tanpa gradien ungu, tanpa hero raksasa kosong, tanpa kartu seragam berbayang tebal. Gunakan latar `#FAFAF7`, teks `#171717`, aksen indigo `#3730A3`, sudut `rounded-xl`, bayangan tipis (`shadow-sm`), tipografi tegas.
5. **Bahasa Indonesia** di semua teks UI. Format Rupiah via `src/lib/money.ts`, waktu WIB via `src/lib/time.ts`. Jangan format manual di komponen.

## 2. Server vs Client Component

- Default **Server Component**. Ambil data langsung lewat Prisma di server (halaman publik, dashboard).
- `"use client"` hanya untuk interaksi: `SeatMap`, wizard, scanner, countdown, form dengan state, polling.
- Jangan kirim data sensitif (passwordHash, holdToken orang lain, buyerPhone pengunjung lain) ke client component publik.
- Periksa dokumentasi di `node_modules/next/dist/docs/` untuk API Next.js versi terpasang (mis. `params` berupa Promise, `proxy.ts` pengganti middleware, dll.).

## 3. Pola Komponen

- Komponen dasar di `src/components/ui/` (Button, Input, Card, StatusPill, StatCard, Toast, Skeleton, Stepper). Kecil, tanpa library UI eksternal. Gabungkan kelas dengan `clsx`.
- Ikon dari `lucide-react` saja.
- Tombol utama: lebar penuh di HP, `min-h-12`, kontras tinggi, state `disabled` + `loading` jelas.
- Input: label terlihat (bukan hanya placeholder), pesan error di bawah field, `inputMode`/`type` yang tepat (`tel` untuk WhatsApp).
- Bar bawah menempel (`sticky bottom-0`) dengan `pb-[env(safe-area-inset-bottom)]`.
- Tap target minimal 44×44px (kursi di denah boleh lebih kecil secara visual, tapi zoom harus membuatnya mudah di-tap).

## 4. State Wajib per Halaman

- **Loading**: skeleton (`loading.tsx` atau komponen Skeleton), bukan spinner layar penuh.
- **Kosong**: ilustrasi/ikon + kalimat + aksi berikutnya ("Belum ada event. Buat event pertama").
- **Error**: pesan manusiawi + tombol coba lagi (`error.tsx`). Jangan tampilkan stack trace.
- **Not found**: `notFound()` untuk slug/kode yang tidak ada.

## 5. SeatMap

- SVG dengan `viewBox` dari `layout.canvas`; pan/zoom via transform pada `<g>` (pointer events + pinch dua jari + wheel + tombol +/−/reset).
- Render kursi sebagai elemen ringan (`<rect>`/`<circle>` + `<use>` untuk ikon). Memoisasi daftar kursi; saat polling hanya kursi yang statusnya berubah yang dirender ulang (`React.memo` per kursi dengan props primitif).
- Bedakan *drag* vs *tap* (ambang gerak ±6px) agar geser denah tidak memilih kursi.
- Legenda selalu terlihat dekat denah; di HP berupa baris yang bisa digeser horizontal.
- Tooltip/kartu kursi: label, zona, harga, status, tombol Pilih/Batalkan.

## 6. Aksesibilitas Minimum

- Kontras teks ≥ 4.5:1; status punya ikon/pola + teks di legenda.
- Elemen interaktif bisa difokus; `aria-label` untuk tombol ikon dan kursi (`"Kursi C-12, VIP, Rp150.000, tersedia"`).
- Jangan menonaktifkan zoom browser.

## 7. Checklist Sebelum Selesai

- [ ] Tidak ada scroll horizontal di 390px
- [ ] Teks Indonesia konsisten, tidak ada lorem ipsum
- [ ] Loading/kosong/error ada
- [ ] Harga & status penjualan terlihat jelas
- [ ] Tidak ada warna zona yang bentrok dengan amber/abu-abu/hijau
