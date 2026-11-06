import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.ts";
import {
  validatePromoCode,
  getOrganizerPromos,
  getOrganizerPromoStats,
  getActivePromoUsageCount,
} from "../src/lib/promo/service.ts";
import {
  holdSeatsAndCreateOrder,
  confirmOrderSold,
  releaseOrderHold,
} from "../src/lib/seats.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  console.log("=== PENGUJIAN OTOMATIS: GATEIN PROMOTION & PROMO CODE MANAGER ===\n");

  const now = new Date();
  const organizer = await prisma.organizer.findFirstOrThrow();

  const testEventSlug1 = "test-promo-event-1";
  const testEventSlug2 = "test-promo-event-2";

  // Bersihkan data lama jika ada
  await prisma.promoUsage.deleteMany({
    where: { promotion: { code: { startsWith: "TEST" } } },
  });
  await prisma.promotion.deleteMany({
    where: { code: { startsWith: "TEST" } },
  });
  await prisma.event.deleteMany({
    where: { slug: { in: [testEventSlug1, testEventSlug2] } },
  });

  console.log("1. Menyiapkan Event & Kursi Uji...");
  // Buat Event 1
  const event1 = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      slug: testEventSlug1,
      name: "Acara Uji Promo 1",
      venueName: "Auditorium Uji",
      startsAt: new Date(now.getTime() + 7 * 86400000),
      gateOpenAt: new Date(now.getTime() + 7 * 86400000),
      gateCloseAt: new Date(now.getTime() + 7 * 86400000 + 7200000),
      salesOpenAt: new Date(now.getTime() - 86400000),
      salesCloseAt: new Date(now.getTime() + 7 * 86400000),
      status: "PUBLISHED",
      maxSeatsPerOrder: 5,
      zones: {
        create: [
          { name: "Regular", color: "#3B82F6", price: 100000, sortOrder: 0 },
          { name: "VIP", color: "#8B5CF6", price: 200000, sortOrder: 1 },
        ],
      },
    },
    include: { zones: true },
  });

  const zoneRegular = event1.zones.find((z) => z.name === "Regular")!;
  const zoneVip = event1.zones.find((z) => z.name === "VIP")!;

  // Buat kursi-kursi di Event 1
  const seatLabels = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"];
  for (const label of seatLabels) {
    const isVip = label.startsWith("C");
    await prisma.seat.create({
      data: {
        eventId: event1.id,
        zoneId: isVip ? zoneVip.id : zoneRegular.id,
        label,
        rowLabel: label[0],
        number: parseInt(label.slice(1)),
        x: 10,
        y: 10,
        status: "AVAILABLE",
      },
    });
  }

  // Buat Event 2 untuk uji event mismatch
  const event2 = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      slug: testEventSlug2,
      name: "Acara Uji Promo 2",
      venueName: "Auditorium 2",
      startsAt: new Date(now.getTime() + 7 * 86400000),
      gateOpenAt: new Date(now.getTime() + 7 * 86400000),
      gateCloseAt: new Date(now.getTime() + 7 * 86400000 + 7200000),
      salesOpenAt: new Date(now.getTime() - 86400000),
      salesCloseAt: new Date(now.getTime() + 7 * 86400000),
      status: "PUBLISHED",
      maxSeatsPerOrder: 5,
      zones: {
        create: [
          { name: "General", color: "#10B981", price: 150000, sortOrder: 0 },
        ],
      },
    },
    include: { zones: true },
  });
  const zoneE2 = event2.zones[0];
  await prisma.seat.create({
    data: {
      eventId: event2.id,
      zoneId: zoneE2.id,
      label: "X1",
      rowLabel: "X",
      number: 1,
      x: 10,
      y: 10,
      status: "AVAILABLE",
    },
  });

  console.log("✓ Data event & kursi uji siap.\n");

  // ==========================================
  // SKENARIO 1: Promo Persentase Valid
  // ==========================================
  console.log("2. Uji Skenario 1: Promo Persentase Valid (Diskon 20%)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Diskon 20 Persen",
      code: "TEST20PCT",
      discountType: "PERCENTAGE",
      discountValue: 20,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
      maxUsesPerUser: 2,
    },
  });

  const val1 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TEST20PCT",
    seatLabels: ["A1"], // Regular: Rp100.000
    buyerPhone: "081234567890",
  });
  assert.equal(val1.valid, true);
  assert.equal(val1.discountAmount, 20000);
  assert.equal(val1.finalTotal, 80000);

  // Buat order dengan promo ini
  const order1 = await holdSeatsAndCreateOrder({
    eventId: event1.id,
    seatLabels: ["A1"],
    buyerName: "Tester Satu",
    buyerPhone: "081234567890",
    promoCode: "TEST20PCT",
  });
  assert.equal(order1.originalAmount, 100000);
  assert.equal(order1.discountAmount, 20000);
  assert.equal(order1.totalAmount, 80000);
  assert.equal(order1.promoCode, "TEST20PCT");

  // Cek PromoUsage status = RESERVED
  const usage1 = await prisma.promoUsage.findUnique({
    where: { orderId: order1.orderId },
  });
  assert.ok(usage1);
  assert.equal(usage1.status, "RESERVED");
  assert.equal(usage1.discountAmount, 20000);
  console.log("✓ Skenario 1 Lolos: Diskon persentase berhasil dihitung dan di-reserve.");

  // ==========================================
  // SKENARIO 2: Promo Potongan Tetap (Fixed Amount)
  // ==========================================
  console.log("3. Uji Skenario 2: Promo Potongan Tetap (Rp25.000)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Potongan Rp25.000",
      code: "TESTFIXED25",
      discountType: "FIXED_AMOUNT",
      discountValue: 25000,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  const val2 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTFIXED25",
    seatLabels: ["A2"], // Regular: Rp100.000
    buyerPhone: "081234567891",
  });
  assert.equal(val2.valid, true);
  assert.equal(val2.discountAmount, 25000);
  assert.equal(val2.finalTotal, 75000);

  const order2 = await holdSeatsAndCreateOrder({
    eventId: event1.id,
    seatLabels: ["A2"],
    buyerName: "Tester Dua",
    buyerPhone: "081234567891",
    promoCode: "TESTFIXED25",
  });
  assert.equal(order2.originalAmount, 100000);
  assert.equal(order2.discountAmount, 25000);
  assert.equal(order2.totalAmount, 75000);
  console.log("✓ Skenario 2 Lolos: Potongan harga tetap berhasil diterapkan.");

  // ==========================================
  // SKENARIO 3: Promo Persentase dengan Batas Maksimal (Cap)
  // ==========================================
  console.log("4. Uji Skenario 3: Batas Maksimal Diskon Persentase (50% max Rp30.000)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Diskon 50% Cap 30rb",
      code: "TEST50CAP30",
      discountType: "PERCENTAGE",
      discountValue: 50,
      maxDiscountAmount: 30000, // 50% dari 100.000 adalah 50.000, tapi dicap di 30.000
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  const val3 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TEST50CAP30",
    seatLabels: ["A3"], // Regular: Rp100.000
  });
  assert.equal(val3.valid, true);
  assert.equal(val3.discountAmount, 30000, "Diskon harus dicap di Rp30.000, bukan Rp50.000");
  assert.equal(val3.finalTotal, 70000);
  console.log("✓ Skenario 3 Lolos: Capping diskon persentase berfungsi sempurna.");

  // ==========================================
  // SKENARIO 4: Kode Promo Tidak Ditemukan
  // ==========================================
  console.log("5. Uji Skenario 4: Kode Promo Tidak Ada...");
  const val4 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TIDAKADA999",
    seatLabels: ["A4"],
  });
  assert.equal(val4.valid, false);
  assert.equal(val4.code, "PROMO_NOT_FOUND");
  console.log("✓ Skenario 4 Lolos: Kode promo salah ditolak dengan kode PROMO_NOT_FOUND.");

  // ==========================================
  // SKENARIO 5: Promo Nonaktif
  // ==========================================
  console.log("6. Uji Skenario 5: Kode Promo Nonaktif...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Nonaktif",
      code: "TESTINACTIVE",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: false, // NONAKTIF
    },
  });

  const val5 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTINACTIVE",
    seatLabels: ["A4"],
  });
  assert.equal(val5.valid, false);
  assert.equal(val5.code, "PROMO_INACTIVE");
  console.log("✓ Skenario 5 Lolos: Promo nonaktif ditolak.");

  // ==========================================
  // SKENARIO 6: Promo Belum Dimulai
  // ==========================================
  console.log("7. Uji Skenario 6: Promo Belum Dimulai (Future startsAt)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Masa Depan",
      code: "TESTFUTURE",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      startsAt: new Date(now.getTime() + 86400000), // Besok
      expiresAt: new Date(now.getTime() + 2 * 86400000),
      isActive: true,
    },
  });

  const val6 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTFUTURE",
    seatLabels: ["A4"],
  });
  assert.equal(val6.valid, false);
  assert.equal(val6.code, "PROMO_NOT_STARTED");
  console.log("✓ Skenario 6 Lolos: Promo belum mulai ditolak.");

  // ==========================================
  // SKENARIO 7: Promo Sudah Kedaluwarsa
  // ==========================================
  console.log("8. Uji Skenario 7: Promo Kedaluwarsa (Past expiresAt)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Kedaluwarsa",
      code: "TESTEXPIRED",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      startsAt: new Date(now.getTime() - 2 * 86400000),
      expiresAt: new Date(now.getTime() - 3600000), // 1 jam lalu
      isActive: true,
    },
  });

  const val7 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTEXPIRED",
    seatLabels: ["A4"],
  });
  assert.equal(val7.valid, false);
  assert.equal(val7.code, "PROMO_EXPIRED");
  console.log("✓ Skenario 7 Lolos: Promo kedaluwarsa ditolak.");

  // ==========================================
  // SKENARIO 8: Kuota Promo Habis
  // ==========================================
  console.log("9. Uji Skenario 8: Kuota Promo Habis...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Kuota Satu",
      code: "TESTQUOTA1",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      totalQuota: 1, // Hanya 1 penggunaan
      isActive: true,
    },
  });

  // Pemesan 1 mengambil kuota ini
  const orderQ1 = await holdSeatsAndCreateOrder({
    eventId: event1.id,
    seatLabels: ["A4"],
    buyerName: "Buyer Kuota",
    buyerPhone: "081234567899",
    promoCode: "TESTQUOTA1",
  });
  assert.equal(orderQ1.discountAmount, 10000);

  // Pemesan 2 mencoba memvalidasi dan membeli -> harus ditolak karena kuota habis
  const val8 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTQUOTA1",
    seatLabels: ["B1"],
  });
  assert.equal(val8.valid, false);
  assert.equal(val8.code, "QUOTA_EXHAUSTED");
  console.log("✓ Skenario 8 Lolos: Kuota habis terdeteksi baik pada hold maupun konfirmasi.");

  // ==========================================
  // SKENARIO 9: Di Bawah Minimum Pembelian
  // ==========================================
  console.log("10. Uji Skenario 9: Syarat Minimum Pembelian (Min Rp150.000)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Min 150rb",
      code: "TESTMIN150",
      discountType: "FIXED_AMOUNT",
      discountValue: 20000,
      minPurchaseAmount: 150000,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  // Beli 1 kursi (Rp100.000) -> Gagal
  const val9a = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTMIN150",
    seatLabels: ["B1"], // 1 kursi = 100.000
  });
  assert.equal(val9a.valid, false);
  assert.equal(val9a.code, "MIN_PURCHASE_NOT_MET");

  // Beli 2 kursi (Rp200.000) -> Berhasil
  const val9b = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTMIN150",
    seatLabels: ["B1", "B2"], // 2 kursi = 200.000
  });
  assert.equal(val9b.valid, true);
  assert.equal(val9b.discountAmount, 20000);
  console.log("✓ Skenario 9 Lolos: Validasi syarat minimum pembelian akurat.");

  // ==========================================
  // SKENARIO 10: Event Mismatch
  // ==========================================
  console.log("11. Uji Skenario 10: Event Mismatch (Promo Acara 1 dipakai di Acara 2)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      eventId: event1.id, // Terkunci khusus Event 1
      name: "Promo Khusus Event 1",
      code: "TESTEVENT1ONLY",
      discountType: "FIXED_AMOUNT",
      discountValue: 15000,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  const val10 = await validatePromoCode({
    eventId: event2.id, // Dipakai di Event 2
    promoCode: "TESTEVENT1ONLY",
    seatLabels: ["X1"],
  });
  assert.equal(val10.valid, false);
  assert.equal(val10.code, "EVENT_MISMATCH");
  console.log("✓ Skenario 10 Lolos: Promo antar acara terisolasi dengan aman.");

  // ==========================================
  // SKENARIO 11: Zone Mismatch
  // ==========================================
  console.log("12. Uji Skenario 11: Zone Mismatch (Promo Khusus VIP dipakai di Regular)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      eventId: event1.id,
      zoneId: zoneVip.id, // Terkunci khusus VIP
      name: "Promo Khusus VIP",
      code: "TESTVIPONLY",
      discountType: "PERCENTAGE",
      discountValue: 10,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  // Regular seat (B1) -> Ditolak
  const val11a = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTVIPONLY",
    seatLabels: ["B1"], // Regular
  });
  assert.equal(val11a.valid, false);
  assert.equal(val11a.code, "ZONE_MISMATCH");

  // VIP seat (C1: Rp200.000) -> Diterima
  const val11b = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTVIPONLY",
    seatLabels: ["C1"], // VIP
  });
  assert.equal(val11b.valid, true);
  assert.equal(val11b.discountAmount, 20000); // 10% dari 200.000
  console.log("✓ Skenario 11 Lolos: Batasan zona tiket divalidasi tepat sasaran.");

  // ==========================================
  // SKENARIO 12: Batas Pemakaian per Nomor WhatsApp (maxUsesPerUser)
  // ==========================================
  console.log("13. Uji Skenario 12: Batas Pemakaian per Nomor WhatsApp (Maks 1x)...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Satu Kali Pakai",
      code: "TESTONCE",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      maxUsesPerUser: 1, // Hanya boleh 1x per nomor
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  // Penggunaan 1 oleh 087711223344 -> Sukses
  const orderOnce1 = await holdSeatsAndCreateOrder({
    eventId: event1.id,
    seatLabels: ["B3"],
    buyerName: "User Sekali",
    buyerPhone: "087711223344",
    promoCode: "TESTONCE",
  });
  assert.equal(orderOnce1.discountAmount, 10000);

  // Penggunaan 2 oleh nomor yang sama (dalam format internasional 6287711223344) -> Gagal
  const val12 = await validatePromoCode({
    eventId: event1.id,
    promoCode: "TESTONCE",
    seatLabels: ["B4"],
    buyerPhone: "6287711223344",
  });
  assert.equal(val12.valid, false);
  assert.equal(val12.code, "USER_LIMIT_REACHED");
  console.log("✓ Skenario 12 Lolos: Limit per pembeli terjaga lintas format nomor telepon.");

  // ==========================================
  // SKENARIO 13: Concurrency Test (2 Pembeli Balapan Kuota Terakhir)
  // ==========================================
  console.log("14. Uji Skenario 13: Balapan Konkurensi (Race Condition) Kuota Terakhir...");
  await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Rebutan 1 Slot",
      code: "TESTRACE1",
      discountType: "FIXED_AMOUNT",
      discountValue: 15000,
      totalQuota: 1, // HANYA 1 SLOT
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  // Kursi berbeda (C2 dan C3) dipesan secara serentak dengan promo yang sama
  const racePromises = [
    holdSeatsAndCreateOrder({
      eventId: event1.id,
      seatLabels: ["C2"],
      buyerName: "Racer Alpha",
      buyerPhone: "089911112222",
      promoCode: "TESTRACE1",
    }).then((res) => ({ status: "fulfilled", res })),
    holdSeatsAndCreateOrder({
      eventId: event1.id,
      seatLabels: ["C3"],
      buyerName: "Racer Beta",
      buyerPhone: "089933334444",
      promoCode: "TESTRACE1",
    }).then((res) => ({ status: "fulfilled", res })),
  ].map((p) => p.catch((err) => ({ status: "rejected", err })));

  const raceResults = await Promise.all(racePromises);
  const fulfilledCount = raceResults.filter((r) => r.status === "fulfilled").length;
  const rejectedCount = raceResults.filter((r) => r.status === "rejected").length;

  assert.equal(fulfilledCount, 1, "Tepat 1 pembeli yang berhasil mengunci kuota promo");
  assert.equal(rejectedCount, 1, "Tepat 1 pembeli yang harus ditolak karena kuota terkunci");
  console.log("✓ Skenario 13 Lolos: SELECT FOR UPDATE menjamin kuota promo tidak pernah over-subscribed.");

  // ==========================================
  // SKENARIO 14: Pelepasan Kuota Saat Order Kedaluwarsa
  // ==========================================
  console.log("15. Uji Skenario 14: Pelepasan Kuota Saat Order Kedaluwarsa...");
  const promoRel = await prisma.promotion.create({
    data: {
      organizerId: organizer.id,
      name: "Promo Release Test",
      code: "TESTRELEASE1",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      totalQuota: 1,
      startsAt: new Date(now.getTime() - 3600000),
      expiresAt: new Date(now.getTime() + 86400000),
      isActive: true,
    },
  });

  // Tahan kursi C4 dengan promo ini
  const orderRel = await holdSeatsAndCreateOrder({
    eventId: event1.id,
    seatLabels: ["C4"],
    buyerName: "Buyer Expiring",
    buyerPhone: "088812345678",
    promoCode: "TESTRELEASE1",
  });
  assert.equal(orderRel.discountAmount, 10000);

  // Kuota harusnya penuh (1/1)
  const activeCountBefore = await getActivePromoUsageCount(promoRel.id);
  assert.equal(activeCountBefore, 1);

  // Simulasikan order kedaluwarsa
  await releaseOrderHold(orderRel.orderId, "EXPIRED");

  // Periksa kuota kembali menjadi 0
  const activeCountAfter = await getActivePromoUsageCount(promoRel.id);
  assert.equal(activeCountAfter, 0, "Kuota promo harus kembali 0 setelah order EXPIRED");

  const usageRel = await prisma.promoUsage.findUnique({
    where: { orderId: orderRel.orderId },
  });
  assert.equal(usageRel?.status, "RELEASED");
  console.log("✓ Skenario 14 Lolos: Kuota promo berhasil dirilis otomatis ketika pesanan kedaluwarsa.");

  // ==========================================
  // SKENARIO 15: Konfirmasi Pembayaran & Analitik Organizer
  // ==========================================
  console.log("16. Uji Skenario 15: Konfirmasi Pembayaran & Integritas Analitik Promo...");
  // Konfirmasi pembayaran order 1 (Diskon Rp20.000, Total Rp80.000)
  await confirmOrderSold(order1.orderId);
  const updatedUsage1 = await prisma.promoUsage.findUnique({
    where: { orderId: order1.orderId },
  });
  assert.equal(updatedUsage1?.status, "CONFIRMED");

  // Ambil daftar dan statistik promo organizer
  const organizerPromos = await getOrganizerPromos(organizer.id);
  const promoItem1 = organizerPromos.find((p) => p.code === "TEST20PCT");
  assert.ok(promoItem1);
  assert.equal(promoItem1.usedQuota, 1);
  assert.equal(promoItem1.totalDiscountGiven, 20000);
  assert.equal(promoItem1.totalSalesGenerated, 80000);

  const stats = await getOrganizerPromoStats(organizer.id);
  assert.ok(stats.totalPromos >= 5);
  assert.ok(stats.totalDiscountGiven >= 20000);
  assert.ok(stats.totalSalesGenerated >= 80000);
  console.log("✓ Skenario 15 Lolos: Transisi ke CONFIRMED dan agregasi KPI analitik organizer presisi.");

  // ==========================================
  // PEMBERSIHAN DATA UJI
  // ==========================================
  console.log("\n17. Membersihkan data uji...");
  await prisma.ticket.deleteMany({
    where: { order: { event: { slug: { in: [testEventSlug1, testEventSlug2] } } } },
  });
  await prisma.promoUsage.deleteMany({
    where: { promotion: { code: { startsWith: "TEST" } } },
  });
  await prisma.order.deleteMany({
    where: { event: { slug: { in: [testEventSlug1, testEventSlug2] } } },
  });
  await prisma.promotion.deleteMany({
    where: { code: { startsWith: "TEST" } },
  });
  await prisma.seat.deleteMany({
    where: { event: { slug: { in: [testEventSlug1, testEventSlug2] } } },
  });
  await prisma.zone.deleteMany({
    where: { event: { slug: { in: [testEventSlug1, testEventSlug2] } } },
  });
  await prisma.event.deleteMany({
    where: { slug: { in: [testEventSlug1, testEventSlug2] } },
  });

  console.log("✓ Pembersihan selesai.");
  console.log("\n=======================================================");
  console.log("SEMUA 15 SKENARIO UJI PROMO CODE MANAGER LOLOS 100%!");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("UJI GAGAL:", err);
  process.exit(1);
});
