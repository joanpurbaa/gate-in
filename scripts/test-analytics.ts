import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.ts";
import { getSalesPerformanceAnalytics } from "../src/lib/analytics/service.ts";
import { holdSeatsAndCreateOrder, confirmOrderSold } from "../src/lib/seats.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  console.log("=== PENGUJIAN OTOMATIS: GATEIN SALES PERFORMANCE ANALYTICS ===\n");

  const now = new Date();

  // Ambil organizer 1 & buat/ambil organizer 2 untuk pengujian isolasi multi-organizer
  const organizer1 = await prisma.organizer.findFirstOrThrow();
  let organizer2 = await prisma.organizer.findUnique({
    where: { email: "panitia2@demo.id" },
  });

  if (!organizer2) {
    organizer2 = await prisma.organizer.create({
      data: {
        email: "panitia2@demo.id",
        name: "Panitia Dua Demo",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      },
    });
  }

  const slugEvent1 = "test-analytics-event-1";
  const slugEvent2 = "test-analytics-event-2";

  // Bersihkan data uji lama jika ada
  await prisma.event.deleteMany({
    where: { slug: { in: [slugEvent1, slugEvent2] } },
  });

  // Buat Event 1 (Milik Organizer 1) dengan 2 zona harga berbeda
  const event1 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      slug: slugEvent1,
      name: "Acara Uji Analitik 1",
      venueName: "Venue Analitik A",
      startsAt: new Date(now.getTime() + 5 * 86400000),
      gateOpenAt: new Date(now.getTime() + 5 * 86400000),
      gateCloseAt: new Date(now.getTime() + 5 * 86400000 + 7200000),
      salesOpenAt: new Date(now.getTime() - 10 * 86400000),
      salesCloseAt: new Date(now.getTime() + 4 * 86400000),
      status: "PUBLISHED",
      zones: {
        create: [
          { name: "Zona VIP", color: "#F59E0B", price: 200000, sortOrder: 0 },
          { name: "Zona Reguler", color: "#3B82F6", price: 100000, sortOrder: 1 },
        ],
      },
    },
    include: { zones: true },
  });

  const vipZone = event1.zones.find((z) => z.name === "Zona VIP")!;
  const regZone = event1.zones.find((z) => z.name === "Zona Reguler")!;

  // Buat 4 kursi di Event 1: 2 VIP (V-1, V-2) dan 2 Reguler (R-1, R-2)
  await prisma.seat.createMany({
    data: [
      { eventId: event1.id, zoneId: vipZone.id, label: "V-1", rowLabel: "V", number: 1, x: 10, y: 10, status: "AVAILABLE" },
      { eventId: event1.id, zoneId: vipZone.id, label: "V-2", rowLabel: "V", number: 2, x: 20, y: 10, status: "AVAILABLE" },
      { eventId: event1.id, zoneId: regZone.id, label: "R-1", rowLabel: "R", number: 1, x: 10, y: 20, status: "AVAILABLE" },
      { eventId: event1.id, zoneId: regZone.id, label: "R-2", rowLabel: "R", number: 2, x: 20, y: 20, status: "AVAILABLE" },
    ],
  });

  // Buat Event 2 (Milik Organizer 2) untuk menguji proteksi akses antar organizer
  await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      slug: slugEvent2,
      name: "Acara Organizer Lain (Event 2)",
      venueName: "Venue Analitik B",
      startsAt: new Date(now.getTime() + 10 * 86400000),
      gateOpenAt: new Date(now.getTime() + 10 * 86400000),
      gateCloseAt: new Date(now.getTime() + 10 * 86400000 + 7200000),
      salesOpenAt: new Date(now.getTime() - 2 * 86400000),
      salesCloseAt: new Date(now.getTime() + 9 * 86400000),
      status: "PUBLISHED",
      zones: {
        create: { name: "Zona Terpisah", color: "#10B981", price: 50000 },
      },
    },
  });

  try {
    // =========================================================================
    // UJI 1: Event tanpa transaksi (Empty State & Nilai 0 Bersih)
    // =========================================================================
    console.log("Uji 1: Memverifikasi event tanpa transaksi menghasilkan metrik nol yang bersih...");
    const emptyAnalytics = await getSalesPerformanceAnalytics(organizer1.id, {
      eventId: event1.id,
      period: "30d",
      granularity: "daily",
    });

    assert.equal(emptyAnalytics.overview.grossRevenue.value, 0);
    assert.equal(emptyAnalytics.overview.ticketsSold.value, 0);
    assert.equal(emptyAnalytics.overview.paidOrders.value, 0);
    assert.equal(emptyAnalytics.overview.occupancyRate, 0);
    assert.equal(emptyAnalytics.overview.attendanceRate, 0);
    assert.equal(emptyAnalytics.occupancy.totalCapacity, 4);
    assert.equal(emptyAnalytics.occupancy.availableSeats, 4);
    assert.equal(emptyAnalytics.occupancy.soldSeats, 0);
    console.log("✓ Empty state terverifikasi dengan benar: Gross Revenue = 0, Occupancy = 0%.");

    // =========================================================================
    // UJI 2: Order EXPIRED & FAILED tidak boleh masuk ke Gross Revenue
    // =========================================================================
    console.log("\nUji 2: Memverifikasi order EXPIRED & FAILED tidak masuk ke pendapatan kotor...");
    // Buat order expired langsung
    await prisma.order.create({
      data: {
        id: "ord_test_expired_123",
        eventId: event1.id,
        buyerName: "Pembeli Batal",
        buyerPhone: "6289999999991",
        status: "EXPIRED",
        totalAmount: 200000,
        holdToken: "token_exp_123",
        holdExpiresAt: new Date(now.getTime() - 3600000),
        expiredAt: new Date(now.getTime() - 3600000),
      },
    });

    // Buat order failed langsung
    await prisma.order.create({
      data: {
        id: "ord_test_failed_123",
        eventId: event1.id,
        buyerName: "Pembeli Gagal",
        buyerPhone: "6289999999992",
        status: "FAILED",
        totalAmount: 100000,
        holdToken: "token_fail_123",
        holdExpiresAt: new Date(now.getTime() - 7200000),
      },
    });

    const analyticsAfterFailed = await getSalesPerformanceAnalytics(organizer1.id, {
      eventId: event1.id,
      period: "30d",
      granularity: "daily",
    });

    assert.equal(analyticsAfterFailed.overview.grossRevenue.value, 0, "Gross revenue harus tetap 0");
    assert.equal(analyticsAfterFailed.overview.paidOrders.value, 0, "Paid orders harus tetap 0");
    console.log("✓ Order EXPIRED dan FAILED berhasil diabaikan dari perhitungan Gross Revenue.");

    // =========================================================================
    // UJI 3: Transaksi PAID berhasil masuk ke Revenue dan Zona Akurat
    // =========================================================================
    console.log("\nUji 3: Memverifikasi transaksi PAID (1 VIP Rp200.000 + 1 Reguler Rp100.000)...");
    const held = await holdSeatsAndCreateOrder({
      eventId: event1.id,
      seatLabels: ["V-1", "R-1"],
      buyerName: "Budi Analitik",
      buyerPhone: "6281234567890",
    });

    const confirmed = await confirmOrderSold(held.orderId);
    assert.equal(confirmed.tickets.length, 2);

    const analyticsPaid = await getSalesPerformanceAnalytics(organizer1.id, {
      eventId: event1.id,
      period: "30d",
      granularity: "daily",
    });

    assert.equal(analyticsPaid.overview.grossRevenue.value, 300000, "Gross revenue harus Rp300.000");
    assert.equal(analyticsPaid.overview.paidOrders.value, 1, "Paid orders = 1");
    assert.equal(analyticsPaid.overview.ticketsSold.value, 2, "Tiket terjual = 2");
    assert.equal(analyticsPaid.overview.averageOrderValue.value, 300000);
    assert.equal(analyticsPaid.overview.averageTicketsPerOrder, 2);

    // Verifikasi performa per zona
    const zoneVipStat = analyticsPaid.zones.find((z) => z.zoneName === "Zona VIP")!;
    const zoneRegStat = analyticsPaid.zones.find((z) => z.zoneName === "Zona Reguler")!;

    assert.equal(zoneVipStat.ticketsSold, 1);
    assert.equal(zoneVipStat.revenue, 200000);
    assert.equal(zoneVipStat.availableQuota, 1); // 2 - 1 = 1
    assert.equal(zoneVipStat.occupancyRate, 50); // 1/2 = 50%

    assert.equal(zoneRegStat.ticketsSold, 1);
    assert.equal(zoneRegStat.revenue, 100000);
    assert.equal(zoneRegStat.availableQuota, 1); // 2 - 1 = 1
    assert.equal(zoneRegStat.occupancyRate, 50); // 1/2 = 50%

    console.log("✓ Transaksi PAID, tiket, dan kontribusi harga per zona terverifikasi presisi.");

    // =========================================================================
    // UJI 4: Keterisian Kursi (Occupancy) Konsisten dengan Kursi HELD
    // =========================================================================
    console.log("\nUji 4: Memverifikasi keterisian kursi dengan kombinasi SOLD dan HELD...");
    // Tahan kursi V-2
    await holdSeatsAndCreateOrder({
      eventId: event1.id,
      seatLabels: ["V-2"],
      buyerName: "Penahan Kursi",
      buyerPhone: "6281112223334",
    });

    const occAnalytics = await getSalesPerformanceAnalytics(organizer1.id, {
      eventId: event1.id,
      period: "30d",
      granularity: "daily",
    });

    assert.equal(occAnalytics.occupancy.totalCapacity, 4);
    assert.equal(occAnalytics.occupancy.soldSeats, 2);
    assert.equal(occAnalytics.occupancy.heldSeats, 1);
    assert.equal(occAnalytics.occupancy.availableSeats, 1);
    assert.equal(occAnalytics.occupancy.occupancyRate, 50); // 2 / 4 * 100 = 50%
    console.log("✓ Status kursi Occupancy terverifikasi konsisten: 4 total, 2 SOLD, 1 HELD, 1 AVAILABLE.");

    // =========================================================================
    // UJI 5: Attendance Analytics (Check-in Valid vs Used)
    // =========================================================================
    console.log("\nUji 5: Memverifikasi analitik kehadiran (Check-in)...");
    // Saat ini 2 tiket berstatus VALID (belum check-in)
    assert.equal(occAnalytics.attendance.totalSoldTickets, 2);
    assert.equal(occAnalytics.attendance.checkedInCount, 0);
    assert.equal(occAnalytics.attendance.unattendedCount, 2);
    assert.equal(occAnalytics.attendance.attendanceRate, 0);

    // Lakukan check-in pada 1 tiket
    const firstTicket = await prisma.ticket.findFirstOrThrow({
      where: { eventId: event1.id },
    });

    await prisma.ticket.update({
      where: { id: firstTicket.id },
      data: {
        status: "USED",
        checkedInAt: new Date(),
        checkedInBy: "Gate-1-Utama",
      },
    });

    const checkedInAnalytics = await getSalesPerformanceAnalytics(organizer1.id, {
      eventId: event1.id,
      period: "30d",
      granularity: "daily",
    });

    assert.equal(checkedInAnalytics.attendance.checkedInCount, 1);
    assert.equal(checkedInAnalytics.attendance.unattendedCount, 1);
    assert.equal(checkedInAnalytics.attendance.attendanceRate, 50); // 1 dari 2 = 50%
    console.log("✓ Attendance rate terverifikasi akurat: 50% hadir (1 dari 2 tiket).");

    // =========================================================================
    // UJI 6: Sales Velocity (Distribusi Jam & Hari Pembelian)
    // =========================================================================
    console.log("\nUji 6: Memverifikasi modul kecepatan penjualan (Sales Velocity)...");
    assert.equal(checkedInAnalytics.velocity.hourly.length, 24);
    assert.equal(checkedInAnalytics.velocity.daysOfWeek.length, 7);
    assert.ok(checkedInAnalytics.velocity.peakHour.ticketCount >= 2);
    assert.ok(checkedInAnalytics.velocity.peakDay.ticketCount >= 2);
    console.log("✓ Sales velocity terhitung: 24 jam dan 7 hari wib terisi tanpa error.");

    // =========================================================================
    // UJI 7: Actionable Insights Berbasis Perhitungan Nyata
    // =========================================================================
    console.log("\nUji 7: Memverifikasi insight actionable berbasis kalkulasi nyata...");
    assert.ok(checkedInAnalytics.insights.length > 0, "Harus menghasilkan minimal 1 insight");
    const topZoneInsight = checkedInAnalytics.insights.find((i) => i.id === "insight-top-zone");
    assert.ok(topZoneInsight, "Insight zona terlaris harus ada");
    console.log("✓ Actionable insights dihasilkan dari data nyata:", topZoneInsight.message);

    // =========================================================================
    // UJI 8: Isolasi Multi-Organizer (Organizer 2 tidak bisa melihat Event 1)
    // =========================================================================
    console.log("\nUji 8: Memverifikasi isolasi hak akses data antar organizer...");
    await assert.rejects(
      async () => {
        // Organizer 2 mencoba mengambil analitik event 1 milik Organizer 1
        await getSalesPerformanceAnalytics(organizer2.id, {
          eventId: event1.id,
          period: "30d",
          granularity: "daily",
        });
      },
      (err: unknown) => {
        const error = err as Error;
        assert.ok(error.message.includes("tidak ditemukan") || error.message.includes("akses"));
        return true;
      }
    );
    console.log("✓ Organizer lain tidak dapat mengakses analitik acara yang bukan miliknya.");

    console.log("\n=======================================================");
    console.log("SEMUA PENGUJIAN SALES PERFORMANCE ANALYTICS LOLOS 100%!");
    console.log("=======================================================");
  } finally {
    // Bersihkan data uji terisolasi
    await prisma.event.deleteMany({
      where: { slug: { in: [slugEvent1, slugEvent2] } },
    });
    console.log("Pembersihan: Event uji analitik berhasil dihapus.");
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
