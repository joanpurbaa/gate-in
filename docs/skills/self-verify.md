# Skill: Self-Verify

Jalankan checklist ini **sebelum** mencentang tahap di `docs/PROGRESS.md` dan sebelum commit. Laporkan hasilnya apa adanya, termasuk yang gagal.

## 1. Wajib Setiap Tahap

1. `npm run lint` → 0 error (warning boleh, tapi catat bila signifikan)
2. `npx tsc --noEmit` → 0 error
3. `npm run build` → sukses
4. Jalankan `npm run dev` (atau `npm start` setelah build), lalu cek dengan `curl`:
   - Halaman yang disentuh tahap ini mengembalikan 200 (atau redirect yang diharapkan)
   - Rute API yang disentuh mengembalikan bentuk JSON yang benar, termasuk kasus error (400/401/403/404/409)
5. Tidak ada `console.error` tak terduga di log server
6. `git status` bersih dari file sampah (tidak ada `.env*`, file debug, gambar uji)

## 2. Aturan Keras (cek setiap tahap)

- [ ] Status kursi hanya diubah di `src/lib/seats.ts` → `grep -rn "status" src --include=*.ts* | grep -i seat` dan pastikan tidak ada `seat.update*`/`UPDATE "Seat"` di luar `seats.ts` (kecuali seed/skrip uji)
- [ ] Harga/total dihitung di server
- [ ] Rute `/api/admin/*` dan halaman `/admin/*` cek sesi **dan** `event.organizerId`
- [ ] Input divalidasi `zod` di server
- [ ] Tidak ada tulis disk saat runtime (`fs.writeFile` dll.)
- [ ] Tidak ada rahasia di client bundle (hanya `NEXT_PUBLIC_*` yang boleh di client)
- [ ] Waktu disimpan UTC, ditampilkan WIB

## 3. Locking Kursi (Tahap 4, 5, dan setiap perubahan `seats.ts`)

Jalankan skrip di `scripts/` terhadap database dan tampilkan output:
- N permintaan hold paralel untuk kursi yang sama → **tepat 1** berhasil, sisanya `SEATS_TAKEN`
- Pesanan multi-kursi dengan 1 kursi bentrok → **0** kursi tertahan oleh pesanan itu (rollback penuh)
- Hold kedaluwarsa → bisa diambil pesanan lain; pembayaran pesanan lama ditolak dengan pesan jelas
- Bayar ditekan dua kali → tiket tidak dobel (cek `Ticket.seatId` unik)
- Bersihkan data uji setelahnya (atau jalankan ulang seed)

## 4. Check-in (Tahap 7)

- `DEMO000VLD` → VALID, lalu scan ulang → SUDAH DIGUNAKAN (dengan jam)
- `DEMO000USD` → SUDAH DIGUNAKAN
- `ZZZZ999999` → TIDAK VALID
- Kode dari event lain → TIDAK VALID
- 2 permintaan check-in paralel pada tiket valid → tepat 1 VALID
- Tanpa sesi → 401; sesi organizer lain → 403/404

## 5. Tampilan

- Lebar 390px: tidak ada scroll horizontal (cek kelas `w-[...]`/`min-w` tetap, tabel dibungkus `overflow-x-auto`)
- Loading/kosong/error ada di halaman yang disentuh
- Teks Indonesia, format Rupiah dan WIB konsisten
- Manusia tetap perlu cek visual di HP; tulis langkah cek manual di laporan

## 6. Setelah Lulus

1. Centang tahap di `docs/PROGRESS.md`, catat keputusan & masalah terbuka
2. `git add -A && git commit -m "tahap-N: ringkasan singkat"` (jangan push)
3. Laporan pendek: apa yang jadi, apa yang perlu dicek manual, apa yang belum
