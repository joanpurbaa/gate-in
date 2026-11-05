import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db.ts";
import {
  holdSeatsAndCreateOrder,
  confirmOrderSold,
} from "../src/lib/seats.ts";
import { sendOrderWhatsApp } from "../src/lib/wa.ts";
import { verifyAndCheckInTicket } from "../src/lib/checkin.ts";
import { buildLayout, layoutToSeats } from "../src/lib/layout/generate.ts";
import { validateGenerator } from "../src/lib/layout/validate.ts";

async function main() {
  console.log("=== [1/4] Verifikasi Skenario 1 & 2: Booking + Bayar + Kirim WA Fonnte (082275338090) ===");

  const event = await prisma.event.findUniqueOrThrow({
    where: { slug: "bandung-tech-summit-2026" },
    include: { zones: true },
  });

  const testSeat = await prisma.seat.findUniqueOrThrow({
    where: {
      eventId_label: {
        eventId: event.id,
        label: "A-10",
      },
    },
    include: { zone: true },
  });

  // Bersihkan tiket pada kursi A-10 bila ada
  await prisma.ticket.deleteMany({ where: { seatId: testSeat.id } });
  await prisma.seat.update({
    where: { id: testSeat.id },
    data: { status: "AVAILABLE", heldUntil: null, orderId: null, holdToken: null },
  });

  const holdRes = await holdSeatsAndCreateOrder({
    eventId: event.id,
    buyerName: "Joan Orlanda Purba (Demo GateIn)",
    buyerPhone: "6282275338090",
    seatLabels: ["A-10"],
  });

  assert.ok(holdRes.orderId, "Hold kursi A-10 harus menghasilkan orderId");

  const confirmRes = await confirmOrderSold(holdRes.orderId);
  assert.equal(confirmRes.alreadyPaid, false, "Confirm order sold harus baru dibayar");
  assert.equal(confirmRes.tickets.length, 1, "Harus menghasilkan 1 tiket");

  const createdTicket = confirmRes.tickets[0]!;
  console.log("Tiket berhasil diterbitkan:", createdTicket.code);

  // Kirim WhatsApp ke nomor penguji 082275338090 via Fonnte
  const waRes = await sendOrderWhatsApp(confirmRes.orderId);
  console.log("Hasil kirim WA Fonnte ke 6282275338090:", waRes);

  console.log("\n=== [2/4] Verifikasi Skenario 3: Rebutan Kursi Atomik (E-5) ===");
  const seatE5 = await prisma.seat.findUniqueOrThrow({
    where: { eventId_label: { eventId: event.id, label: "E-5" } },
  });
  await prisma.ticket.deleteMany({ where: { seatId: seatE5.id } });
  await prisma.seat.update({
    where: { id: seatE5.id },
    data: { status: "AVAILABLE", heldUntil: null, orderId: null, holdToken: null },
  });

  const raceResults = await Promise.allSettled([
    holdSeatsAndCreateOrder({
      eventId: event.id,
      buyerName: "Tab A",
      buyerPhone: "628111111111",
      seatLabels: ["E-5"],
    }),
    holdSeatsAndCreateOrder({
      eventId: event.id,
      buyerName: "Tab B",
      buyerPhone: "628222222222",
      seatLabels: ["E-5"],
    }),
  ]);
  const winners = raceResults.filter((r) => r.status === "fulfilled");
  const losers = raceResults.filter((r) => r.status === "rejected");
  assert.equal(winners.length, 1, "Hanya 1 pemenang rebutan E-5");
  assert.equal(losers.length, 1, "1 kalah rebutan E-5");
  console.log("Lulus: 1 pemenang, 1 SEATS_TAKEN pada kursi E-5.");

  console.log("\n=== [3/4] Verifikasi Skenario 4: Check-In QR 3 Kondisi ===");
  const validScan = await verifyAndCheckInTicket({
    eventId: event.id,
    code: createdTicket.code,
    organizerId: event.organizerId,
  });
  assert.equal(validScan.result, "VALID", "Scan pertama harus VALID");

  const duplicateScan = await verifyAndCheckInTicket({
    eventId: event.id,
    code: createdTicket.code,
    organizerId: event.organizerId,
  });
  assert.equal(duplicateScan.result, "ALREADY_USED", "Scan kedua harus ALREADY_USED");

  const invalidScan = await verifyAndCheckInTicket({
    eventId: event.id,
    code: "SALAH12345",
    organizerId: event.organizerId,
  });
  assert.equal(invalidScan.result, "INVALID", "Kode acak harus INVALID");
  console.log("Lulus: VALID -> ALREADY_USED -> INVALID.");

  console.log("\n=== [4/4] Verifikasi Skenario 5: Generator Layout & Validasi ===");
  const circleValidation = validateGenerator({
    type: "circle",
    params: {
      rings: 3,
      seatsPerRing: [20, 28, 36],
      aisleGaps: 2,
      gapSizeSeats: 2,
      startAngleDeg: -90,
    },
    removedLabels: [],
  });
  assert.equal(circleValidation.ok, true, "Generator circle harus valid");
  if (!circleValidation.ok) throw new Error("Unreachable");
  const built = buildLayout(circleValidation.generator);
  const seats = layoutToSeats(built);
  console.log(`Lulus: Circle layout valid (${seats.length} kursi).`);

  // Pulihkan tiket uji WA ke VALID dan E-5 ke AVAILABLE agar siap didemokan langsung
  await prisma.ticket.updateMany({
    where: { code: createdTicket.code },
    data: { status: "VALID", checkedInAt: null, checkedInBy: null },
  });
  await prisma.seat.update({
    where: { id: seatE5.id },
    data: { status: "AVAILABLE", heldUntil: null, orderId: null, holdToken: null },
  });
  await prisma.order.deleteMany({
    where: { eventId: event.id, buyerName: { in: ["Tab A", "Tab B"] } },
  });

  console.log("\nSemua skenario E2E lulus dan status kursi/tiket demo telah dipulihkan!");
}

main()
  .catch((err) => {
    console.error("E2E gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
