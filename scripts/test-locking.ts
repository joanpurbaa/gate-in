import { existsSync } from "node:fs";
import { prisma } from "../src/lib/db.ts";
import {
  confirmOrderSold,
  holdSeatsAndCreateOrder,
  OrderHoldInvalidError,
  releaseOrderHold,
  SeatsTakenError,
} from "../src/lib/seats.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  const event = await prisma.event.findUnique({
    where: { slug: "bandung-tech-summit-2026" },
  });
  if (!event) {
    throw new Error("Event demo bandung-tech-summit-2026 belum ada. Jalankan npm run seed dulu.");
  }

  const createdOrderIds: string[] = [];

  try {
    // Pastikan kursi uji E-5, E-6, E-7 tersedia sebelum mulai
    await prisma.ticket.deleteMany({
      where: { eventId: event.id, seat: { label: { in: ["E-5", "E-6", "E-7"] } } },
    });
    await prisma.seat.updateMany({
      where: { eventId: event.id, label: { in: ["E-5", "E-6", "E-7"] } },
      data: { status: "AVAILABLE", heldUntil: null, holdToken: null, orderId: null },
    });

    // =========================================================================
    // UJI 1: 8 permintaan paralel untuk kursi yang sama (E-5) -> tepat 1 berhasil
    // =========================================================================
    console.log("Uji 1: Menjalankan 8 permintaan hold paralel untuk kursi E-5...");
    const parallelAttempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, idx) =>
        holdSeatsAndCreateOrder({
          eventId: event.id,
          seatLabels: ["E-5"],
          buyerName: `Pemesan Paralel ${idx + 1}`,
          buyerPhone: `628120000000${idx + 1}`,
        })
      )
    );

    const fulfilled = parallelAttempts.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof holdSeatsAndCreateOrder>>> =>
        r.status === "fulfilled"
    );
    const rejected = parallelAttempts.filter(
      (r): r is PromiseRejectedResult =>
        r.status === "rejected" && r.reason instanceof SeatsTakenError
    );

    if (fulfilled.length !== 1 || rejected.length !== 7) {
      throw new Error(
        `Hasil balapan tidak sesuai! Berhasil: ${fulfilled.length} (seharusnya 1), Ditolak SEATS_TAKEN: ${rejected.length} (seharusnya 7)`
      );
    }
    const winnerOrder = fulfilled[0].value;
    createdOrderIds.push(winnerOrder.orderId);
    console.log(
      `✔ Uji 1 LOLOS: Tepat 1 pemesan berhasil menahan E-5 (${winnerOrder.orderId}), 7 pemesan lain ditolak dengan SEATS_TAKEN.`
    );

    // =========================================================================
    // UJI 2: Pesanan multi-kursi (E-6 dan E-5) saat E-5 sedang ditahan -> rollback penuh
    // =========================================================================
    console.log("Uji 2: Pesanan multi-kursi [E-6, E-5] dengan E-5 bentrok...");
    let multiFailedWithSeatsTaken = false;
    try {
      const res = await holdSeatsAndCreateOrder({
        eventId: event.id,
        seatLabels: ["E-6", "E-5"],
        buyerName: "Pemesan Multi Bentrok",
        buyerPhone: "6281200000099",
      });
      createdOrderIds.push(res.orderId);
    } catch (err) {
      if (err instanceof SeatsTakenError && err.takenLabels.includes("E-5")) {
        multiFailedWithSeatsTaken = true;
      } else {
        throw err;
      }
    }

    const seatE6 = await prisma.seat.findUniqueOrThrow({
      where: { eventId_label: { eventId: event.id, label: "E-6" } },
    });
    if (!multiFailedWithSeatsTaken || seatE6.status !== "AVAILABLE" || seatE6.holdToken !== null) {
      throw new Error(
        `Rollback multi-kursi gagal! Status E-6=${seatE6.status}, holdToken=${seatE6.holdToken}`
      );
    }
    console.log(
      "✔ Uji 2 LOLOS: Pesanan [E-6, E-5] gagal dengan SEATS_TAKEN (E-5) dan E-6 tetap AVAILABLE (0 kursi bocor tertahan)."
    );

    // Lepas hold pemenang Uji 1
    await releaseOrderHold(winnerOrder.orderId, "FAILED");

    // =========================================================================
    // UJI 3: Hold kedaluwarsa bisa diambil orang lain & order lama ditolak saat bayar
    // =========================================================================
    console.log("Uji 3: Hold kedaluwarsa pada E-7 diambil pengunjung baru...");
    const expiredOrder = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-7"],
      buyerName: "Pemesan Kedaluwarsa",
      buyerPhone: "6281200000101",
      holdDurationMs: -5000, // sudah lewat 5 detik yang lalu
    });
    createdOrderIds.push(expiredOrder.orderId);

    const newBuyerOrder = await holdSeatsAndCreateOrder({
      eventId: event.id,
      seatLabels: ["E-7"],
      buyerName: "Pemesan Baru E-7",
      buyerPhone: "6281200000102",
    });
    createdOrderIds.push(newBuyerOrder.orderId);

    // Pemesan lama mencoba bayar setelah kursinya diambil pemesan baru
    let oldOrderRejected = false;
    try {
      await confirmOrderSold(expiredOrder.orderId);
    } catch (err) {
      if (err instanceof OrderHoldInvalidError && err.code === "HOLD_TAKEN") {
        oldOrderRejected = true;
      } else {
        throw err;
      }
    }
    if (!oldOrderRejected) {
      throw new Error("Order lama yang hold-nya sudah diambil orang lain seharusnya ditolak!");
    }

    // Pemesan baru mengonfirmasi pembayaran (dan uji idempotensi tekan 2x)
    const confirm1 = await confirmOrderSold(newBuyerOrder.orderId);
    const confirm2 = await confirmOrderSold(newBuyerOrder.orderId);
    if (confirm1.tickets.length !== 1 || !confirm2.alreadyPaid) {
      throw new Error("Konfirmasi pembayaran pemesan baru atau idempotensi gagal!");
    }
    console.log(
      `✔ Uji 3 LOLOS: Hold kedaluwarsa diambil pemesan baru (${newBuyerOrder.orderId}), pembayaran pemesan lama ditolak (HOLD_TAKEN), dan pembayaran ganda aman (tiket: ${confirm1.tickets[0].code}).`
    );
  } finally {
    // Bersihkan data uji agar database kembali ke kondisi seed bersih
    await prisma.ticket.deleteMany({
      where: { orderId: { in: createdOrderIds } },
    });
    await prisma.seat.updateMany({
      where: { eventId: event.id, label: { in: ["E-5", "E-6", "E-7"] } },
      data: { status: "AVAILABLE", heldUntil: null, holdToken: null, orderId: null },
    });
    await prisma.order.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
    console.log("✔ Data uji dibersihkan: kursi E-5, E-6, E-7 kembali AVAILABLE.");
  }
}

main()
  .catch((err) => {
    console.error("Uji locking gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
