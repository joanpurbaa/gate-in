import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.ts";
import {
  registerWaitingList,
  getWaitingListStatus,
  claimWaitingListOffer,
  WaitingListError,
} from "../src/lib/waiting-list/service.ts";
import {
  matchWaitingListForEvent,
  sweepExpiredOffers,
} from "../src/lib/waiting-list/matcher.ts";
import { holdSeatsAndCreateOrder, SeatsTakenError } from "../src/lib/seats.ts";
import { sendWaitingListOfferWhatsApp } from "../src/lib/wa.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  console.log("=== PENGUJIAN OTOMATIS: GATEIN SMART WAITING LIST ===\n");

  const organizer = await prisma.organizer.findFirstOrThrow();
  const testSlug = "test-smart-waiting-list";

  // Bersihkan event uji lama jika ada
  await prisma.event.deleteMany({ where: { slug: testSlug } });

  const now = new Date();
  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      slug: testSlug,
      name: "Acara Uji Smart Waiting List",
      venueName: "Venue Uji Bandung",
      startsAt: new Date(now.getTime() + 7 * 86400000),
      gateOpenAt: new Date(now.getTime() + 7 * 86400000),
      gateCloseAt: new Date(now.getTime() + 7 * 86400000 + 10800000),
      salesOpenAt: new Date(now.getTime() - 86400000),
      salesCloseAt: new Date(now.getTime() + 6 * 86400000),
      maxSeatsPerOrder: 5,
      status: "PUBLISHED",
      layout: {
        version: "v1",
        canvas: { width: 800, height: 600 },
        stage: { x: 400, y: 50, width: 200, height: 40, label: "PANGGUNG" },
        seats: [],
      },
      zones: {
        create: {
          name: "Zona Uji",
          color: "#3B82F6",
          price: 50000,
          sortOrder: 0,
        },
      },
    },
    include: {
      zones: true,
    },
  });

  const zone = event.zones[0];

  // Buat tepat 4 kursi untuk pengujian terkontrol: S-1, S-2, S-3, S-4
  await prisma.seat.createMany({
    data: [
      { eventId: event.id, zoneId: zone.id, label: "S-1", rowLabel: "S", number: 1, x: 100, y: 100, status: "SOLD" },
      { eventId: event.id, zoneId: zone.id, label: "S-2", rowLabel: "S", number: 2, x: 140, y: 100, status: "SOLD" },
      { eventId: event.id, zoneId: zone.id, label: "S-3", rowLabel: "S", number: 3, x: 180, y: 100, status: "SOLD" },
      { eventId: event.id, zoneId: zone.id, label: "S-4", rowLabel: "S", number: 4, x: 220, y: 100, status: "SOLD" },
    ],
  });

  console.log(`Event uji terisolasi berhasil dibuat: ${event.name} (${zone.name})`);
  console.log("Kondisi awal: Seluruh 4 kursi berstatus SOLD (Event Sold Out).\n");

  try {
    // =========================================================================
    // UJI 1: Pendaftaran Waiting List saat tiket habis (Sold Out)
    // =========================================================================
    console.log("Uji 1: Memverifikasi pendaftaran waiting list pembeli saat sold out...");
    const reg1 = await registerWaitingList({
      eventId: event.id,
      zoneId: zone.id,
      buyerName: "Calon Pembeli Satu",
      buyerPhone: "081111111111",
      quantity: 1,
    });

    assert.equal(reg1.entry.buyerName, "Calon Pembeli Satu");
    assert.equal(reg1.entry.buyerPhone, "6281111111111");
    assert.equal(reg1.entry.status, "WAITING");
    assert.equal(reg1.queuePosition, 1);
    assert.ok(reg1.entry.token.length >= 32, "Token harus kriptografis panjang & unguessable");
    console.log("✓ Pendaftaran berhasil. Token:", reg1.entry.token.slice(0, 10) + "..., Posisi:", reg1.queuePosition);

    // =========================================================================
    // UJI 2: Pencegahan Duplikasi Entri Aktif
    // =========================================================================
    console.log("\nUji 2: Memverifikasi pencegahan pendaftaran duplikat aktif...");
    await assert.rejects(
      async () => {
        await registerWaitingList({
          eventId: event.id,
          zoneId: zone.id,
          buyerName: "Calon Pembeli Satu Duplikat",
          buyerPhone: "081111111111",
          quantity: 1,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof WaitingListError);
        assert.equal(err.code, "DUPLICATE_ENTRY");
        return true;
      }
    );
    console.log("✓ Duplikasi nomor WhatsApp dalam zona yang sama berhasil ditolak.");

    // =========================================================================
    // UJI 3: Satu kursi kembali tersedia -> Mencocokkan kandidat 1 kursi
    // =========================================================================
    console.log("\nUji 3: Satu kursi kembali tersedia -> Mencocokkan kandidat 1 kursi...");
    await prisma.seat.update({
      where: { eventId_label: { eventId: event.id, label: "S-1" } },
      data: { status: "AVAILABLE" },
    });

    const match1 = await matchWaitingListForEvent(event.id, zone.id);
    assert.equal(match1.matchedCount, 1);

    const checkedEntry1 = await getWaitingListStatus(reg1.entry.token);
    assert.ok(checkedEntry1);
    assert.equal(checkedEntry1.status, "OFFERED");
    assert.ok(checkedEntry1.offerExpiresAt, "Batas waktu offerExpiresAt harus terisi");
    console.log("✓ Status kandidat berhasil berubah menjadi OFFERED dengan timer 15 menit.");

    // =========================================================================
    // UJI 4: Pembeli meminta lebih banyak kursi daripada yang tersedia
    // =========================================================================
    console.log("\nUji 4: Pembeli meminta 3 kursi saat kursi efektif tersisa 0...");
    const reg3Seats = await registerWaitingList({
      eventId: event.id,
      zoneId: zone.id,
      buyerName: "Keluarga Butuh Tiga Tiket",
      buyerPhone: "082222222222",
      quantity: 3,
    });

    // Kursi S-1 sudah di-hold oleh penawaran reg1, jadi efektif tersedia = 0
    const match2 = await matchWaitingListForEvent(event.id, zone.id);
    assert.equal(match2.matchedCount, 0, "Tidak boleh mencocokkan jika kuota tidak cukup");

    const checkedReg3 = await getWaitingListStatus(reg3Seats.entry.token);
    assert.equal(checkedReg3?.status, "WAITING", "Kandidat 3 tiket harus tetap WAITING");
    console.log("✓ Pembeli meminta lebih banyak kursi tetap berada di antrean WAITING (tidak parsial).");

    // =========================================================================
    // UJI 5: Tiga kursi kembali tersedia -> Mencocokkan kandidat 3 kursi
    // =========================================================================
    console.log("\nUji 5: Tiga kursi (S-2, S-3, S-4) kembali tersedia -> Mencocokkan kandidat 3 kursi...");
    await prisma.seat.updateMany({
      where: { eventId: event.id, label: { in: ["S-2", "S-3", "S-4"] } },
      data: { status: "AVAILABLE" },
    });

    const match3 = await matchWaitingListForEvent(event.id, zone.id);
    assert.equal(match3.matchedCount, 1);
    const checkedReg3After = await getWaitingListStatus(reg3Seats.entry.token);
    assert.equal(checkedReg3After?.status, "OFFERED", "Kandidat 3 kursi kini berstatus OFFERED");
    console.log("✓ Kandidat 3 kursi berhasil mendapatkan penawaran saat 3 kursi tersedia.");

    // =========================================================================
    // UJI 6: Urutan antrean FIFO antara 2 kandidat pada zona yang sama
    // =========================================================================
    console.log("\nUji 6: Memverifikasi urutan antrean FIFO (First In, First Out)...");
    const regC1 = await registerWaitingList({
      eventId: event.id,
      zoneId: zone.id,
      buyerName: "Kandidat FIFO Pertama",
      buyerPhone: "083333333333",
      quantity: 1,
    });

    await new Promise((r) => setTimeout(r, 20));

    const regC2 = await registerWaitingList({
      eventId: event.id,
      zoneId: zone.id,
      buyerName: "Kandidat FIFO Kedua",
      buyerPhone: "084444444444",
      quantity: 1,
    });

    // Bersihkan penawaran reg1 dan reg3Seats agar tidak memakan kuota kursi
    await prisma.waitingListEntry.updateMany({
      where: { id: { in: [reg1.entry.id, reg3Seats.entry.id] } },
      data: { status: "CANCELLED" },
    });

    // Atur hanya 1 kursi tersedia (S-1) dan 3 lainnya SOLD
    await prisma.seat.updateMany({
      where: { eventId: event.id, label: { in: ["S-2", "S-3", "S-4"] } },
      data: { status: "SOLD" },
    });
    await prisma.seat.update({
      where: { eventId_label: { eventId: event.id, label: "S-1" } },
      data: { status: "AVAILABLE" },
    });

    const matchFIFO = await matchWaitingListForEvent(event.id, zone.id);
    assert.equal(matchFIFO.matchedCount, 1);

    const checkedC1 = await getWaitingListStatus(regC1.entry.token);
    const checkedC2 = await getWaitingListStatus(regC2.entry.token);

    assert.equal(checkedC1?.status, "OFFERED", "Kandidat pertama harus mendapat offer lebih dulu");
    assert.equal(checkedC2?.status, "WAITING", "Kandidat kedua harus tetap menunggu di antrean");
    console.log("✓ Urutan antrean FIFO terverifikasi berjalan sesuai waktu pendaftaran.");

    // =========================================================================
    // UJI 7: Pembeli tidak merespons -> Penawaran EXPIRED & diteruskan ke kandidat berikutnya
    // =========================================================================
    console.log("\nUji 7: Pembeli tidak merespons (offer expired) -> Otomatis diteruskan ke antrean berikutnya...");
    // Simulasi C1 melewati batas waktu penawaran
    await prisma.waitingListEntry.update({
      where: { id: regC1.entry.id },
      data: { offerExpiresAt: new Date(Date.now() - 5000) },
    });

    // Jalankan sweepExpiredOffers
    const sweepResult = await sweepExpiredOffers(event.id);
    assert.equal(sweepResult.expiredCount, 1);

    const recheckC1 = await getWaitingListStatus(regC1.entry.token);
    assert.equal(recheckC1?.status, "EXPIRED", "Offer C1 berubah menjadi EXPIRED");

    // Pencocokan otomatis meneruskan kursi ke C2
    await matchWaitingListForEvent(event.id, zone.id);
    const recheckC2 = await getWaitingListStatus(regC2.entry.token);
    assert.equal(recheckC2?.status, "OFFERED", "Offer berhasil dialihkan ke kandidat berikutnya (C2)");
    console.log("✓ Penawaran kedaluwarsa berhasil dialihkan otomatis ke kandidat berikutnya.");

    // =========================================================================
    // UJI 8: Konversi penawaran & Link penawaran digunakan dua kali
    // =========================================================================
    console.log("\nUji 8: Memverifikasi token penawaran dikonversi & tidak bisa dipakai dua kali...");
    const orderBooking = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["S-1"],
      buyerName: checkedC2!.buyerName,
      buyerPhone: checkedC2!.buyerPhone,
    });

    const claimed = await claimWaitingListOffer(checkedC2!.token, orderBooking.orderId);
    assert.equal(claimed, true, "Penawaran berhasil dikonversi");

    const recheckC2Claimed = await getWaitingListStatus(checkedC2!.token);
    assert.equal(recheckC2Claimed?.status, "CONVERTED");

    // Percobaan klaim kedua kali dengan token yang sama
    const claimAgain = await claimWaitingListOffer(checkedC2!.token, "order-palsu-kedua");
    assert.equal(claimAgain, false, "Klaim kedua kali dengan token yang sudah CONVERTED harus gagal");
    console.log("✓ Penawaran berhasil dikonversi dan link penawaran ditolak saat dicoba kedua kali.");

    // =========================================================================
    // UJI 9: Atomic Locking mencegah pemesanan ganda pada kursi yang sama
    // =========================================================================
    console.log("\nUji 9: Memverifikasi atomic locking mencegah double booking...");
    await assert.rejects(
      async () => {
        await holdSeatsAndCreateOrder({
          eventId: event.id,
          seatLabels: ["S-1"],
          buyerName: "Pembeli Pesaing",
          buyerPhone: "6289999999999",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof SeatsTakenError);
        assert.deepEqual(err.takenLabels, ["S-1"]);
        return true;
      }
    );
    console.log("✓ Kursi yang sudah di-lock tidak bisa diambil pembeli lain (SeatsTakenError).");

    // =========================================================================
    // UJI 10: Fonnte WhatsApp error resilience (non-blocking)
    // =========================================================================
    console.log("\nUji 10: Memverifikasi kegagalan WhatsApp tidak merusak transaksi (non-blocking)...");
    const waRes = await sendWaitingListOfferWhatsApp(regC2.entry.id);
    assert.ok(
      waRes.status === "SENT" || waRes.status === "FAILED" || waRes.status === "SKIPPED",
      "Status WhatsApp harus terisolasi dan tidak melempar error tak tertangkap"
    );
    console.log("✓ WhatsApp failure resilience teruji:", waRes.status);

    console.log("\n=======================================================");
    console.log("SEMUA 10 SKENARIO PENGUJIAN SMART WAITING LIST LOLOS 100%!");
    console.log("=======================================================");
  } finally {
    // Hapus event uji bersih-bersih
    await prisma.event.delete({ where: { id: event.id } });
    console.log("Pembersihan: Event uji terisolasi berhasil dihapus.");
  }
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan pengujian:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
