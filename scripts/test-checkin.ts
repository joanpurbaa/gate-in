import { existsSync } from "node:fs";
import { verifyAndCheckInTicket } from "../src/lib/checkin.ts";
import { prisma } from "../src/lib/db.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  const organizer = await prisma.organizer.findUniqueOrThrow({
    where: { email: "panitia@demo.id" },
  });
  const event1 = await prisma.event.findUniqueOrThrow({
    where: { slug: "bandung-tech-summit-2026" },
  });
  const event2 = await prisma.event.findUniqueOrThrow({
    where: { slug: "malam-akustik-melingkar" },
  });

  try {
    // Pastikan DEMO000VLD berstatus VALID di awal
    await prisma.ticket.update({
      where: { code: "DEMO000VLD" },
      data: { status: "VALID", checkedInAt: null, checkedInBy: null },
    });

    // 1. Scan pertama DEMO000VLD -> VALID
    const res1 = await verifyAndCheckInTicket({
      eventId: event1.id,
      code: "DEMO000VLD",
      organizerId: organizer.id,
    });
    if (res1.result !== "VALID" || res1.ticket.seatLabel !== "C-8") {
      throw new Error(`DEMO000VLD scan pertama seharusnya VALID (C-8), dapat: ${JSON.stringify(res1)}`);
    }
    console.log(
      `✔ Check-in 1 (DEMO000VLD): VALID — Kursi ${res1.ticket.seatLabel}, Pemilik: ${res1.ticket.buyerName}`
    );

    // 2. Scan kedua DEMO000VLD -> ALREADY_USED
    const res2 = await verifyAndCheckInTicket({
      eventId: event1.id,
      code: "DEMO000VLD",
      organizerId: organizer.id,
    });
    if (res2.result !== "ALREADY_USED" || !res2.firstCheckedInAt) {
      throw new Error(`DEMO000VLD scan kedua seharusnya ALREADY_USED, dapat: ${JSON.stringify(res2)}`);
    }
    console.log(
      `✔ Check-in 2 (DEMO000VLD ulang): SUDAH DIGUNAKAN — tercatat pada ${res2.firstCheckedInFormatted}`
    );

    // 3. Scan DEMO000USD -> ALREADY_USED
    const res3 = await verifyAndCheckInTicket({
      eventId: event1.id,
      code: "DEMO000USD",
      organizerId: organizer.id,
    });
    if (res3.result !== "ALREADY_USED") {
      throw new Error(`DEMO000USD seharusnya ALREADY_USED, dapat: ${JSON.stringify(res3)}`);
    }
    console.log(
      `✔ Check-in 3 (DEMO000USD): SUDAH DIGUNAKAN — Kursi ${res3.ticket.seatLabel}, tercatat ${res3.firstCheckedInFormatted}`
    );

    // 4. Scan ZZZZ999999 -> INVALID
    const res4 = await verifyAndCheckInTicket({
      eventId: event1.id,
      code: "ZZZZ999999",
      organizerId: organizer.id,
    });
    if (res4.result !== "INVALID") {
      throw new Error(`ZZZZ999999 seharusnya INVALID, dapat: ${JSON.stringify(res4)}`);
    }
    console.log("✔ Check-in 4 (ZZZZ999999): TIDAK VALID");

    // 5. Scan tiket milik Event 2 di Event 1 -> INVALID
    const ev2Ticket = await prisma.ticket.findFirstOrThrow({
      where: { eventId: event2.id },
    });
    const res5 = await verifyAndCheckInTicket({
      eventId: event1.id,
      code: ev2Ticket.code,
      organizerId: organizer.id,
    });
    if (res5.result !== "INVALID") {
      throw new Error("Tiket event lain seharusnya INVALID");
    }
    console.log(`✔ Check-in 5 (Tiket Event 2 ${ev2Ticket.code} di Event 1): TIDAK VALID`);

    // 6. Uji balapan paralel 6 request pada tiket VALID -> tepat 1 VALID, 5 ALREADY_USED
    await prisma.ticket.update({
      where: { code: "DEMO000VLD" },
      data: { status: "VALID", checkedInAt: null, checkedInBy: null },
    });

    const parallel = await Promise.all(
      Array.from({ length: 6 }, () =>
        verifyAndCheckInTicket({
          eventId: event1.id,
          code: "DEMO000VLD",
          organizerId: organizer.id,
        })
      )
    );
    const validCount = parallel.filter((p) => p.result === "VALID").length;
    const usedCount = parallel.filter((p) => p.result === "ALREADY_USED").length;
    if (validCount !== 1 || usedCount !== 5) {
      throw new Error(
        `Balapan check-in gagal! VALID=${validCount} (harus 1), ALREADY_USED=${usedCount} (harus 5)`
      );
    }
    console.log("✔ Check-in 6 (6 request paralel pada DEMO000VLD): tepat 1 VALID, 5 SUDAH DIGUNAKAN.");
  } finally {
    // Kembalikan DEMO000VLD menjadi VALID agar siap dipakai demo kapan saja
    await prisma.ticket.update({
      where: { code: "DEMO000VLD" },
      data: { status: "VALID", checkedInAt: null, checkedInBy: null },
    });
    console.log("✔ Status DEMO000VLD dikembalikan ke VALID untuk kesiapan demo.");
  }
}

main()
  .catch((err) => {
    console.error("Uji check-in gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
