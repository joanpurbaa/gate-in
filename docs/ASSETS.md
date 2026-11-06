# ASSETS — Logo, poster, dan ikon GateIn

Aset gambar adalah bagian yang tidak bisa dibuat agent coding dengan baik, jadi disiapkan manusia dulu, lalu agent hanya memasangnya. Semua acara di GateIn fiktif, jadi semua poster juga harus fiktif.

## 1. Letak berkas di repo

```
public/
  brand/
    gatein-mark.svg            (logo berwarna, untuk latar terang)
    gatein-mark-reversed.svg   (untuk latar Tinta / gelap)
    gatein-mark-mono.svg       (satu warna, mengikuti currentColor)
    favicon.svg
  posters/
    bandung-tech-summit-2026.webp
    malam-akustik-melingkar.webp
    ketawa-kota-kembang.webp
    simfoni-kota-orkestra-muda.webp
    pentas-wayang-golek-reimagined.webp
    workshop-fotografi-jalanan.webp
    career-talk-jalur-kerja-2027.webp
    festival-kopi-priangan-cupping.webp
```

Nama berkas poster **harus sama persis** dengan slug acara di `DESIGN_V2.md` bagian 10, karena seed menunjuk `/posters/{slug}.webp`.

## 2. Logo

Empat berkas SVG sudah disediakan di folder `brand/`. Agent hanya memakainya (lihat `DESIGN_V2.md` bagian 3), tidak menggambar ulang. Warna: Gerbang `#2B2BE8`, Karcis `#D4FF3A`, Tinta `#12112B`.

## 3. Poster: spesifikasi

- Rasio **16:9**, ukuran **1600x900 px**, format **WebP**, maksimal sekitar 250 KB per berkas (kompres di squoosh.app atau alat sejenis, kualitas 78 sampai 82).
- **Tanpa teks sama sekali di dalam gambar.** Generator gambar sering menghasilkan huruf yang rusak, dan nama acara sudah ditampilkan oleh aplikasi. Poster berfungsi sebagai *key art*.
- Biarkan sekitar 40 persen bagian kiri bawah relatif sepi (tanpa objek penting) karena di slide hero bagian itu ditimpa teks dan scrim.
- Tanpa logo, tanpa merek, tanpa wajah tokoh sungguhan atau artis yang bisa dikenali. Orang boleh ada sebagai siluet atau dari belakang.
- Satu keluarga gaya agar delapan poster terlihat sebagai satu platform.

### Gaya rumah (tempel di awal setiap prompt gambar)

> Flat editorial illustration with subtle paper grain, bold geometric shapes, confident layered composition, limited palette: deep ink navy #12112B, ultramarine blue #2B2BE8, electric lime #D4FF3A, plus ONE accent color specific to this poster. No text, no letters, no logos, no watermarks, no recognizable real people. 16:9 landscape, the lower-left 40% of the frame kept calm and uncluttered.

### Prompt per acara (tambahkan setelah gaya rumah)

| Berkas | Prompt |
|---|---|
| `bandung-tech-summit-2026` | Subject: a conference stage seen from the audience, rows of seats as simple blue arcs, glowing circuit-line patterns rising from the stage like a skyline of abstract buildings. Accent: cyan. |
| `malam-akustik-melingkar` | Subject: a small round stage in the center with concentric rings of audience seats viewed from above like ripples, a single acoustic guitar silhouette on the stage lit by a warm spotlight cone. Accent: warm orange. |
| `ketawa-kota-kembang` | Subject: a single standing microphone on a stage with a spotlight, a stylized crowd silhouette from behind with raised hands, playful speech-bubble shapes without any letters. Accent: hot pink. |
| `simfoni-kota-orkestra-muda` | Subject: an orchestra seen from above, curved rows of music stands and abstract violin and cello shapes, flowing sound-wave ribbons crossing the frame. Accent: soft violet. |
| `pentas-wayang-golek-reimagined` | Subject: layered silhouettes of traditional Sundanese rod puppets (wayang golek) in front of a large circular lantern glow, modern geometric reinterpretation, no faces detailed. Accent: golden amber. |
| `workshop-fotografi-jalanan` | Subject: a vintage camera in the foreground with its lens reflecting a stylized Bandung street of Art Deco buildings, scattered photo-frame rectangles floating. Accent: coral red. |
| `career-talk-jalur-kerja-2027` | Subject: a winding path of stepping platforms rising toward a bright doorway on the horizon, small silhouettes of young people walking up, abstract city blocks behind. Accent: teal. |
| `festival-kopi-priangan-cupping` | Subject: overhead view of coffee cups on a long table, steam curls, scattered coffee beans, terraced highland plantation shapes in the background. Accent: warm brown. |

### Alternatif tanpa generator gambar

- Foto stok bebas lisensi (Unsplash atau Pexels) dengan subjek panggung, penonton dari belakang, alat musik, kopi. Pilih yang tidak memuat wajah jelas atau logo, lalu crop 16:9 dan kompres.
- Desain sendiri di Canva dengan template 1600x900, tetap tanpa teks.

Jangan memakai poster asli acara sungguhan atau gambar yang diambil dari platform lain.

## 4. Cadangan otomatis (dikerjakan agent)

Karena penyelenggara baru yang belum mengunggah poster tetap harus tampil rapi, agent membuat komponen `PosterFallback`: poster generatif dari nama acara. Spesifikasi ada di `DESIGN_V2.md` bagian 5 dan di prompt tahap 10. Intinya: pasangan warna dipilih deterministik dari slug (palet Tinta, Gerbang, Karcis plus beberapa pasangan turunan), komposisi bentuk geometris dari lengkung dan lingkaran, dan nama acara dengan Bricolage Grotesque 800 di kiri bawah. Tidak boleh berupa blok gelap dengan ikon kursi.

## 5. Ikon kategori

Enam ikon SVG satu gaya (garis 2px, sudut membulat, kotak 24x24), dibuat agent di `src/components/icons/categories.tsx`: Musik (not atau mikrofon), Teknologi dan bisnis (chip atau layar), Seni dan hiburan (topeng atau tirai panggung), Pendidikan dan workshop (buku atau papan tulis), Komunitas dan gaya hidup (cangkir atau dua orang), Olahraga (bola). Ditampilkan di lingkaran 64px berlatar Gerbang 8 persen.

## 6. Gambar yang dibuat lewat kode

- Open Graph 1200x630 (`opengraph-image`).
- Ikon layar utama 180x180 dari `favicon.svg`.
- Gambar "Simpan tiket" di halaman tiket.

## 7. Urutan kerja yang disarankan

1. Mulai Prompt 10 di agent (tidak butuh poster).
2. Sambil menunggu, buat delapan poster, kompres, beri nama sesuai tabel.
3. Taruh di `public/posters/`, commit dan push.
4. Jalankan Prompt 11 (beranda dan seed) setelah poster ada di repo.