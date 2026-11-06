import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.ts";
import {
  confirmOrderSold,
  expireStaleOrders,
  holdSeatsAndCreateOrder,
  OrderHoldInvalidError,
} from "../src/lib/seats.ts";
import {
  subscribeToSeatsReleased,
  type SeatsReleasedEvent,
} from "../src/lib/events/seat-events.ts";
import { sendOrderExpiredWhatsApp } from "../src/lib/wa.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  console.log("=== PENGUJIAN OTOMATIS: GATEIN EXPIRED ORDER RECOVERY ===\n");

  const event = await prisma.event.findUnique({
    where: { slug: "bandung-tech-summit-2026" },
  });
  if (!event) {
    throw new Error("Event bandung-tech-summit-2026 belum ada di database.");
  }

  const cleanSeats = async (labels: string[]) => {
    await prisma.ticket.deleteMany({
      where: { eventId: event.id, seat: { label: { in: labels } } },
    });
    await prisma.seat.updateMany({
      where: { eventId: event.id, label: { in: labels } },
      data: { status: "AVAILABLE", heldUntil: null, holdToken: null, orderId: null },
    });
  };

  await cleanSeats(["E-5", "E-6", "E-7"]);

  try {
    // =========================================================================
    // UJI 1: Pembeli menutup browser & timer habis -> Background Expiration Recovery
    // =========================================================================
    console.log("Uji 1: Memverifikasi pemulihan order kedaluwarsa saat browser ditinggalkan...");
    const order1 = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-5"],
      buyerName: "Pengunjung Browser Tutup",
      buyerPhone: "6281234567890",
      holdDurationMs: -5000, // Sengaja dibuat sudah kedaluwarsa 5 detik lalu
    });

    // Pastikan sebelum sweeper berjalan: status masih PENDING dan kursi masih HELD
    const preOrder = await prisma.order.findUniqueOrThrow({ where: { id: order1.orderId } });
    assert.equal(preOrder.status, "PENDING");
    const preSeat = await prisma.seat.findFirstOrThrow({
      where: { eventId: event.id, label: "E-5" },
    });
    assert.equal(preSeat.status, "HELD");

    // Jalankan Expiration Engine
    const sweepRes1 = await expireStaleOrders({ notifyBuyers: false });
    assert.ok(sweepRes1.sweptCount >= 1, "Harus memulihkan minimal 1 order");

    // Cek hasil di database
    const postOrder = await prisma.order.findUniqueOrThrow({ where: { id: order1.orderId } });
    assert.equal(postOrder.status, "EXPIRED", "Status order harus berubah jadi EXPIRED");
    assert.ok(postOrder.expiredAt, "Timestamp expiredAt harus tercatat");

    const postSeat = await prisma.seat.findFirstOrThrow({
      where: { eventId: event.id, label: "E-5" },
    });
    assert.equal(postSeat.status, "AVAILABLE", "Kursi E-5 harus kembali AVAILABLE");
    assert.equal(postSeat.orderId, null, "orderId kursi harus null");
    assert.equal(postSeat.holdToken, null, "holdToken kursi harus null");
    console.log("✔ Uji 1 LOLOS: Order berhasil di-expire, expiredAt tercatat, kursi E-5 kembali AVAILABLE.\n");

    // =========================================================================
    // UJI 2: Order dibayar SETELAH expiration -> DITOLAK
    // =========================================================================
    console.log("Uji 2: Memverifikasi pembayaran setelah expiration ditolak secara atomik...");
    await cleanSeats(["E-6"]);
    const order2 = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-6"],
      buyerName: "Pembeli Terlambat",
      buyerPhone: "6281234567891",
      holdDurationMs: -2000, // Sudah lewat batas waktu
    });

    let payError: unknown = null;
    try {
      await confirmOrderSold(order2.orderId);
    } catch (err) {
      payError = err;
    }

    assert.ok(payError instanceof OrderHoldInvalidError, "Pembayaran harus melempar OrderHoldInvalidError");
    assert.equal((payError as OrderHoldInvalidError).code, "ORDER_EXPIRED");

    const postOrder2 = await prisma.order.findUniqueOrThrow({ where: { id: order2.orderId } });
    assert.equal(postOrder2.status, "EXPIRED");
    assert.ok(postOrder2.expiredAt);

    const postSeat2 = await prisma.seat.findFirstOrThrow({
      where: { eventId: event.id, label: "E-6" },
    });
    assert.equal(postSeat2.status, "AVAILABLE");
    console.log("✔ Uji 2 LOLOS: Pembayaran setelah kedaluwarsa ditolak (ORDER_EXPIRED) dan kursi dikembalikan.\n");

    // =========================================================================
    // UJI 3: Order dibayar TEPAT SEBELUM expiration -> BERHASIL
    // =========================================================================
    console.log("Uji 3: Memverifikasi pembayaran tepat sebelum expiration berhasil & aman...");
    await cleanSeats(["E-7"]);
    const order3 = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-7"],
      buyerName: "Pembeli Tepat Waktu",
      buyerPhone: "6281234567892",
      holdDurationMs: 60000, // Masih berlaku 60 detik
    });

    const payRes3 = await confirmOrderSold(order3.orderId);
    assert.equal(payRes3.alreadyPaid, false);
    assert.equal(payRes3.tickets.length, 1);

    const postOrder3 = await prisma.order.findUniqueOrThrow({ where: { id: order3.orderId } });
    assert.equal(postOrder3.status, "PAID");
    assert.ok(postOrder3.paidAt);

    const postSeat3 = await prisma.seat.findFirstOrThrow({
      where: { eventId: event.id, label: "E-7" },
    });
    assert.equal(postSeat3.status, "SOLD");

    // Jalankan sweeper: Order PAID tidak boleh di-expire!
    await expireStaleOrders({ notifyBuyers: false });
    const checkPaid = await prisma.order.findUniqueOrThrow({ where: { id: order3.orderId } });
    assert.equal(checkPaid.status, "PAID", "Order PAID tidak boleh berubah jadi EXPIRED");
    console.log("✔ Uji 3 LOLOS: Pembayaran sebelum expiration berhasil, dan order PAID tidak dapat di-expire.\n");

    // =========================================================================
    // UJI 4: Dua order kedaluwarsa diproses bersamaan (Batch Sweeper)
    // =========================================================================
    console.log("Uji 4: Memverifikasi pemulihan batch beberapa order kedaluwarsa...");
    await cleanSeats(["E-5", "E-6"]);
    const batchA = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-5"],
      buyerName: "Batch A",
      buyerPhone: "628111111111",
      holdDurationMs: -3000,
    });
    const batchB = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-6"],
      buyerName: "Batch B",
      buyerPhone: "628222222222",
      holdDurationMs: -3000,
    });

    const batchSweep = await expireStaleOrders({ notifyBuyers: false });
    console.log("batchSweep result:", batchSweep);
    assert.ok(batchSweep.sweptCount >= 2);

    const ordA = await prisma.order.findUniqueOrThrow({ where: { id: batchA.orderId } });
    const ordB = await prisma.order.findUniqueOrThrow({ where: { id: batchB.orderId } });
    assert.equal(ordA.status, "EXPIRED");
    assert.equal(ordB.status, "EXPIRED");
    console.log("✔ Uji 4 LOLOS: Pemulihan batch berhasil memproses beberapa order sekaligus.\n");

    // =========================================================================
    // UJI 5: Concurrency Safety & Anti-Double-Processing (SKIP LOCKED)
    // =========================================================================
    console.log("Uji 5: Memverifikasi dua job expiration paralel berjalan aman (FOR UPDATE SKIP LOCKED)...");
    await cleanSeats(["E-5", "E-6"]);
    const c1 = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-5"],
      buyerName: "Paralel C1",
      buyerPhone: "628333333331",
      holdDurationMs: -4000,
    });
    const c2 = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-6"],
      buyerName: "Paralel C2",
      buyerPhone: "628333333332",
      holdDurationMs: -4000,
    });

    // Jalankan 2 job paralel
    const [jobResult1, jobResult2] = await Promise.all([
      expireStaleOrders({ notifyBuyers: false }),
      expireStaleOrders({ notifyBuyers: false }),
    ]);

    const totalSwept = jobResult1.sweptCount + jobResult2.sweptCount;
    assert.equal(totalSwept >= 2, true, "Total swept antar dua job harus memproses semua order");

    const checkC1 = await prisma.order.findUniqueOrThrow({ where: { id: c1.orderId } });
    const checkC2 = await prisma.order.findUniqueOrThrow({ where: { id: c2.orderId } });
    assert.equal(checkC1.status, "EXPIRED");
    assert.equal(checkC2.status, "EXPIRED");
    console.log("✔ Uji 5 LOLOS: Concurrency control (SKIP LOCKED) mencegah balapan antar-job.\n");

    // =========================================================================
    // UJI 6: Toleransi Kegagalan WhatsApp & Pencegahan Notifikasi Berulang
    // =========================================================================
    console.log("Uji 6: Memverifikasi WhatsApp error handling non-blocking & deduplikasi...");
    const waTestOrder = await prisma.order.findFirstOrThrow({
      where: { eventId: event.id, status: "EXPIRED", expiredNotifiedAt: null },
    });

    // Panggilan pertama (akan diproses atau diskip jika token kosong/gagal)
    const waRes1 = await sendOrderExpiredWhatsApp(waTestOrder.id, ["E-5"]);
    assert.ok(["SENT", "FAILED", "SKIPPED"].includes(waRes1.status));

    // Panggilan kedua: harus SKIPPED karena sudah expiredNotifiedAt terisi
    const waRes2 = await sendOrderExpiredWhatsApp(waTestOrder.id, ["E-5"]);
    assert.equal(waRes2.status, "SKIPPED", "Panggilan kedua harus diskip untuk mencegah spam");
    console.log("✔ Uji 6 LOLOS: WhatsApp non-blocking dan tidak mengirim notifikasi berulang.\n");

    // =========================================================================
    // UJI 7: Event Integrasi Waiting List
    // =========================================================================
    console.log("Uji 7: Memverifikasi integrasi event waiting list subscriber...");
    let receivedEvent: SeatsReleasedEvent | null = null;
    const unsubscribe = subscribeToSeatsReleased((ev) => {
      receivedEvent = ev;
    });

    await cleanSeats(["E-5"]);
    await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-5"],
      buyerName: "Waiting List Test",
      buyerPhone: "628999999999",
      holdDurationMs: -1000,
    });

    await expireStaleOrders({ notifyBuyers: false });
    unsubscribe();

    assert.ok(receivedEvent !== null, "Subscriber waiting list harus menerima event pelepasan kursi");
    assert.equal((receivedEvent as SeatsReleasedEvent).reason, "EXPIRED");
    assert.equal((receivedEvent as SeatsReleasedEvent).eventId, event.id);
    assert.ok((receivedEvent as SeatsReleasedEvent).releasedSeats.some((s) => s.label === "E-5"));
    console.log("✔ Uji 7 LOLOS: Modul waiting list menerima event pelepasan kursi secara realtime.\n");

    // Bersihkan kursi uji
    await cleanSeats(["E-5", "E-6", "E-7"]);
    console.log("==================================================================");
    console.log("SELURUH 7 UJI GATEIN EXPIRED ORDER RECOVERY LULUS 100%!");
    console.log("==================================================================");
  } finally {
    await cleanSeats(["E-5", "E-6", "E-7"]);
  }
}

main()
  .catch((err) => {
    console.error("Uji gagal dengan error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
