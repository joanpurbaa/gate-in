# SEAT_LAYOUT_SPEC — Layout Kursi dan AI Layout

## 1. Prinsip

1. **AI tidak membuat koordinat bangku.** AI hanya menghasilkan *parameter terstruktur*. Kode deterministik (generator) mengubah parameter menjadi koordinat tiap bangku.
2. **Angka dari teks penyelenggara adalah sumber kebenaran.** Foto dipakai untuk bentuk, posisi panggung, dan lorong. Jika foto dan teks bertentangan, pakai teks dan beri `warnings`.
3. Penyelenggara **selalu melihat preview dan bisa mengoreksi** sebelum menyimpan.
4. Yang disimpan permanen: JSON layout di `Event.layout` + baris `Seat` (koordinat per bangku). Klaim di deck: setia pada struktur (jumlah, susunan, posisi relatif), bukan pada piksel foto.
5. Selalu ada **jalur manual tanpa AI** (template + isian angka). Demo tidak boleh bergantung pada AI.

## 2. Format JSON Layout (versi 1)

```json
{
  "version": 1,
  "canvas": { "width": 1000, "height": 700 },
  "seatSize": 24,
  "stage": { "shape": "rect", "x": 300, "y": 20, "w": 400, "h": 60, "label": "PANGGUNG" },
  "generator": {
    "type": "grid",
    "params": { },
    "removedLabels": ["A-1", "A-20"]
  },
  "labels": [{ "x": 100, "y": 40, "text": "Pintu Masuk" }]
}
```

- `generator.type`: `"grid"` atau `"circle"` (wajib). `"arc"` (kipas/tapal kuda) **hanya jika waktu sisa**.
- `removedLabels`: kursi yang dihapus penyelenggara di editor (generator tetap deterministik, penghapusan disimpan terpisah).
- Posisi dihitung dalam satuan kanvas; SVG merender dengan `viewBox` sehingga responsif.

## 3. Generator

### Grid
Params:
- `rows`, `cols` (1–60)
- `rowLabelStyle`: `"alpha"` (A, B, C…) atau `"numeric"`
- `aisleAfterCols`: array nomor kolom yang diikuti lorong (contoh `[10]`)
- `aisleAfterRows`: array nomor baris yang diikuti lorong
- `stagePosition`: `"top"` | `"bottom"` | `"left"` | `"right"` | `"none"`
- Baris A selalu paling dekat panggung
- Jarak antar kursi dan baris diturunkan dari `seatSize` + gap tetap; lorong menambah jarak ekstra
- Label kursi: `{rowLabel}-{number}`, mis. `C-12`; nomor dihitung dari kiri ke kanan menghadap panggung

### Circle (melingkar, panggung di tengah)
Params:
- `rings`: jumlah ring (1–8)
- `seatsPerRing`: array jumlah kursi per ring (panjang = `rings`), atau `totalSeats` untuk dibagi proporsional ke radius
- `aisleGaps`: jumlah celah lorong yang tersebar rata (0–8), `gapSizeSeats`: lebar celah dalam satuan kursi
- `startAngleDeg`: sudut mulai (default -90 = atas)
- Panggung di tengah (`stage.shape`: `"ellipse"` atau `"rect"`); radius ring pertama dihitung dari ukuran panggung
- Kursi diputar menghadap panggung (`rotation`)
- Label: `R{ring}-{nomor}`, mis. `R2-07`

### Batas validasi (cegah beban berlebih)
Maksimal **1.500 kursi** per event. Di atas itu → tolak dengan pesan jelas.

## 4. Output AI (JSON, divalidasi `zod`)

```json
{
  "type": "grid | circle | unsupported",
  "confidence": 0.0,
  "params": { },
  "stage": { "shape": "rect | ellipse", "position": "top|bottom|left|right|center|none", "label": "PANGGUNG" },
  "warnings": ["string"],
  "questions": ["string"]
}
```

Aturan prompt ke Gemini:
- Input: foto (opsional) + deskripsi teks. Minimal salah satu ada.
- Keluaran **hanya JSON** sesuai skema (gunakan mode keluaran JSON/terstruktur milik SDK), suhu rendah.
- Jangan mengarang angka. Jika jumlah baris/kolom/kursi tidak ada di teks dan tidak jelas di foto, isi estimasi **dan** tambahkan `warnings` ("jumlah kolom diperkirakan dari foto, mohon cek").
- Jika bentuk tidak termasuk `grid`/`circle`, kembalikan `type: "unsupported"` dengan `questions`/saran memakai bentuk terdekat.
- Nama model diambil dari `GEMINI_MODEL`.

Penanganan di server (`lib/ai/layout.ts`):
- Timeout sekitar 25 detik, atur `maxDuration` route sesuai batas Vercel yang berlaku (cek dokumentasi)
- Validasi output dengan zod → jika gagal, 1× retry → jika masih gagal, kembalikan error terkontrol
- Foto dikirim langsung ke Gemini (base64), **tidak disimpan ke disk**; batasi ukuran (± 4 MB) dan kompres di klien bila perlu
- Hasil AI tidak langsung disimpan; selalu lewat preview

## 5. Alur Editor Layout (UI)

1. Langkah input: unggah foto (opsional) + textarea deskripsi + contoh placeholder ("Ruangan 20m x 20m, 15 baris, 20 kolom, panggung di depan, lorong di tengah")
2. Tombol **Buat dengan AI** (loading jelas; bila gagal tampilkan "AI sedang bermasalah, gunakan template manual" + otomatis tampilkan form manual)
3. Tombol **Gunakan template manual**: pilih Grid atau Lingkaran, isi parameter
4. **Preview** SeatMap + panel koreksi:
   - ubah parameter angka → denah dibuat ulang langsung
   - klik kursi untuk **hapus/pulihkan**
   - ubah label panggung, posisi panggung
   - tampilkan `warnings`/`questions` dari AI di atas preview
5. **Zona & harga** (langkah berikutnya): pilih target → tetapkan zona
   - Mode cepat: tombol "pilih baris A–C" / "pilih ring 1"
   - Mode klik: pilih beberapa kursi lalu "Terapkan zona"
   - Zona: nama, warna dari palet, harga
   - Penghitung "N kursi belum diberi zona"
6. Simpan → membuat/merombak baris `Seat` (hapus & buat ulang selama `layoutLocked = false`)

## 6. Komponen SeatMap (dipakai pengunjung, penyelenggara, editor)

Satu komponen dengan mode:
- `mode="select"` (pengunjung): tap kursi tersedia untuk memilih
- `mode="view"` (admin live): menampilkan hijau untuk hadir
- `mode="edit"` (editor): klik untuk hapus/pilih

Wajib: SVG, pan & zoom (pinch/drag, tombol +/−/reset), tap target nyaman di HP, tooltip/kartu kursi (label, zona, harga, status), legenda, dan performa lancar untuk 1.500 kursi (jangan render ulang seluruh peta tiap polling bila tidak berubah).

Detail warna dan status ada di `DESIGN.md`.