import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { buildLayout, layoutToSeats } from "../src/lib/layout/generate.ts";
import type { LayoutGenerator } from "../src/lib/layout/types.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur");
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_DEMO_RESET !== "1" &&
  !connectionString.includes("neon.tech")
) {
  throw new Error(
    "Menolak menjalankan seed pada database non-Neon di mode production tanpa ALLOW_DEMO_RESET=1"
  );
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const EVENT1_SOLD_LABELS = [
  "A-4",
  "A-5",
  "A-10",
  "A-11",
  "A-15",
  "B-8",
  "B-9",
  "B-12",
  "B-13",
  "C-3",
  "C-8",
  "C-9",
  "D-5",
  "D-6",
  "D-14",
  "D-15",
  "E-9",
  "E-10",
  "E-11",
  "F-2",
  "F-3",
  "F-12",
  "F-13",
  "G-7",
  "G-8",
  "G-16",
  "H-4",
  "H-5",
  "H-10",
  "H-11",
  "I-9",
  "I-10",
  "J-6",
  "J-7",
  "K-11",
  "K-12",
  "L-8",
  "L-9",
  "M-10",
  "N-10",
];

const EVENT2_SOLD_LABELS = [
  "R1-01",
  "R1-02",
  "R1-07",
  "R1-08",
  "R1-14",
  "R1-15",
  "R2-03",
  "R2-04",
  "R2-12",
  "R2-13",
  "R2-20",
  "R3-05",
  "R3-06",
  "R3-18",
  "R3-19",
];

const DEMO_BUYER_NAMES = [
  "Raka Pratama",
  "Nadia Kusuma",
  "Dimas Saputra",
  "Ayu Lestari",
  "Fajar Nugroho",
  "Kirana Putri",
  "Reza Oktavian",
  "Tania Maharani",
  "Gilang Ramadhan",
  "Intan Permata",
  "Bagas Adi",
  "Salma Azzahra",
];

function deterministicTicketCode(prefix: string, idx: number): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let suffix = "";
  let n = idx * 197 + 43;
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + idx * (i + 3);
  }
  return `${prefix}${suffix}`.slice(0, 10);
}

async function main() {
  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org1 = await prisma.organizer.upsert({
    where: { email: "panitia@demo.id" },
    update: { name: "Panitia Summarecon Bandung", passwordHash },
    create: {
      email: "panitia@demo.id",
      name: "Panitia Summarecon Bandung",
      passwordHash,
    },
  });

  const org2 = await prisma.organizer.upsert({
    where: { email: "panitia2@demo.id" },
    update: { name: "Panitia Komunitas Kreatif", passwordHash },
    create: {
      email: "panitia2@demo.id",
      name: "Panitia Komunitas Kreatif",
      passwordHash,
    },
  });

  await prisma.event.deleteMany({
    where: {
      slug: {
        in: [
          "bandung-tech-summit-2026",
          "malam-akustik-melingkar",
          "workshop-desain-produk-bandung",
        ],
      },
    },
  });

  // =========================================================================
  // EVENT 1: Bandung Tech Summit 2026 (Grid 15x20 = 300 kursi)
  // =========================================================================
  const ev1StartsAt = new Date(now.getTime() + 7 * day);
  const ev1Generator: LayoutGenerator = {
    type: "grid",
    params: {
      rows: 15,
      cols: 20,
      rowLabelStyle: "alpha",
      aisleAfterCols: [10],
      aisleAfterRows: [],
      stagePosition: "top",
    },
    removedLabels: [],
  };
  const ev1Layout = buildLayout(ev1Generator, {
    stageLabel: "PANGGUNG UTAMA",
    labels: [
      { x: 110, y: 58, text: "Pintu Masuk Barat" },
      { x: 640, y: 58, text: "Pintu Masuk Timur" },
    ],
  });
  const ev1Seats = layoutToSeats(ev1Layout);

  const event1 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "bandung-tech-summit-2026",
      name: "Bandung Tech Summit 2026",
      description:
        "Konferensi teknologi dan produk digital tahunan di Summarecon Mall Bandung. Menghadirkan praktisi engineering, AI, dan desain produk dari ekosistem teknologi Bandung. Pilih kursi Anda langsung dari denah ruangan 1:1.",
      venueName: "Convention Hall Lt. 2, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      startsAt: ev1StartsAt,
      gateOpenAt: new Date(ev1StartsAt.getTime() - 1.5 * hour),
      gateCloseAt: new Date(ev1StartsAt.getTime() + 3 * hour),
      salesOpenAt: new Date(now.getTime() - 1 * day),
      salesCloseAt: new Date(ev1StartsAt.getTime() - 3 * day),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp Panitia: 0812-2026-8800 • info@bandungtechsummit.id",
      policyNote:
        "Tiket yang sudah dibeli bersifat final. Tunjukkan QR code e-ticket di pintu masuk saat jam open gate.",
      status: "PUBLISHED",
      layout: ev1Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev1VipZone, ev1RegZone] = await Promise.all([
    prisma.zone.create({
      data: {
        eventId: event1.id,
        name: "VIP",
        color: "#6366F1",
        price: 150000,
        sortOrder: 1,
      },
    }),
    prisma.zone.create({
      data: {
        eventId: event1.id,
        name: "Reguler",
        color: "#0EA5E9",
        price: 75000,
        sortOrder: 2,
      },
    }),
  ]);

  const ev1SoldIndex = new Map(EVENT1_SOLD_LABELS.map((l, i) => [l, i]));
  const holdExpiresAtB5 = new Date(now.getTime() + 45 * 60 * 1000);

  // Siapkan semua Order Event 1 (40 PAID + 1 PENDING untuk B-5)
  const ev1OrdersData = EVENT1_SOLD_LABELS.map((label, i) => {
    const rowLabel = label.split("-")[0];
    const isVip = ["A", "B", "C"].includes(rowLabel);
    const price = isVip ? ev1VipZone.price : ev1RegZone.price;
    const isDemoValid = label === "C-8";
    const isDemoUsed = label === "C-9";
    const paidAt = new Date(now.getTime() - (45 - i) * 15 * 60 * 1000);
    return {
      id: isDemoValid
        ? "ord_demo_budi_vld"
        : isDemoUsed
          ? "ord_demo_siti_usd"
          : `ord_demo_ev1_${String(i + 1).padStart(2, "0")}`,
      eventId: event1.id,
      buyerName: isDemoValid
        ? "Budi Demo"
        : isDemoUsed
          ? "Siti Demo"
          : DEMO_BUYER_NAMES[i % DEMO_BUYER_NAMES.length],
      buyerPhone: `628122026${String(100 + i)}`,
      status: "PAID" as const,
      totalAmount: price,
      holdToken: `hold_ev1_sold_${i + 1}`,
      holdExpiresAt: new Date(paidAt.getTime() + 10 * 60 * 1000),
      paymentRef: `SIM-EV1-${String(i + 1).padStart(3, "0")}`,
      paidAt,
      waStatus: "SKIPPED" as const,
    };
  });

  await prisma.order.createMany({
    data: [
      ...ev1OrdersData,
      {
        id: "ord_demo_held_b5",
        eventId: event1.id,
        buyerName: "Andi Pratama (Sedang Checkout)",
        buyerPhone: "6281299990005",
        status: "PENDING",
        totalAmount: ev1VipZone.price,
        holdToken: "hold_demo_active_b5",
        holdExpiresAt: holdExpiresAtB5,
      },
    ],
  });

  await prisma.seat.createMany({
    data: ev1Seats.map((s) => {
      const soldIdx = ev1SoldIndex.get(s.label);
      if (soldIdx !== undefined) {
        const ord = ev1OrdersData[soldIdx];
        return {
          eventId: event1.id,
          zoneId: ["A", "B", "C"].includes(s.rowLabel) ? ev1VipZone.id : ev1RegZone.id,
          label: s.label,
          rowLabel: s.rowLabel,
          number: s.number,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          status: "SOLD" as const,
          orderId: ord.id,
          holdToken: ord.holdToken,
        };
      }
      if (s.label === "B-5") {
        return {
          eventId: event1.id,
          zoneId: ev1VipZone.id,
          label: s.label,
          rowLabel: s.rowLabel,
          number: s.number,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          status: "HELD" as const,
          heldUntil: holdExpiresAtB5,
          holdToken: "hold_demo_active_b5",
          orderId: "ord_demo_held_b5",
        };
      }
      return {
        eventId: event1.id,
        zoneId: ["A", "B", "C"].includes(s.rowLabel) ? ev1VipZone.id : ev1RegZone.id,
        label: s.label,
        rowLabel: s.rowLabel,
        number: s.number,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        status: "AVAILABLE" as const,
      };
    }),
  });

  const ev1SoldSeats = await prisma.seat.findMany({
    where: { eventId: event1.id, status: "SOLD" },
  });
  const ev1SeatIdByLabel = new Map(ev1SoldSeats.map((s) => [s.label, s.id]));

  await prisma.ticket.createMany({
    data: EVENT1_SOLD_LABELS.map((label, i) => {
      const isDemoValid = label === "C-8";
      const isDemoUsed = label === "C-9";
      const hasCheckedIn = isDemoUsed || i < 6;
      return {
        orderId: ev1OrdersData[i].id,
        eventId: event1.id,
        seatId: ev1SeatIdByLabel.get(label)!,
        code: isDemoValid
          ? "DEMO000VLD"
          : isDemoUsed
            ? "DEMO000USD"
            : deterministicTicketCode("BTS", i + 1),
        status: hasCheckedIn ? ("USED" as const) : ("VALID" as const),
        checkedInAt: hasCheckedIn ? new Date(now.getTime() - (20 - i) * 60 * 1000) : null,
        checkedInBy: hasCheckedIn ? org1.id : null,
      };
    }),
  });

  // =========================================================================
  // EVENT 2: Malam Akustik Melingkar (Circle 24 + 32 + 40 = 96 kursi, 2 lorong)
  // =========================================================================
  const ev2StartsAt = new Date(now.getTime() + 10 * day);
  const ev2Generator: LayoutGenerator = {
    type: "circle",
    params: {
      rings: 3,
      seatsPerRing: [24, 32, 40],
      aisleGaps: 2,
      gapSizeSeats: 2,
      startAngleDeg: -90,
    },
    removedLabels: [],
  };
  const ev2Layout = buildLayout(ev2Generator, {
    stageLabel: "PANGGUNG 360°",
    stageShape: "ellipse",
  });
  const ev2Seats = layoutToSeats(ev2Layout);

  const event2 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "malam-akustik-melingkar",
      name: "Malam Akustik Melingkar",
      description:
        "Pertunjukan musik akustik intim dengan panggung 360° di tengah ruangan. Kursi disusun melingkar mengelilingi musisi dalam tiga ring sehingga setiap penonton mendapatkan sudut pandang yang dekat dan hangat.",
      venueName: "Atrium Sawarga Courtyard, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      startsAt: ev2StartsAt,
      gateOpenAt: new Date(ev2StartsAt.getTime() - 1 * hour),
      gateCloseAt: new Date(ev2StartsAt.getTime() + 2.5 * hour),
      salesOpenAt: new Date(now.getTime() - 2 * day),
      salesCloseAt: new Date(ev2StartsAt.getTime() - 1 * day),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp Panitia: 0812-2026-9900 • akustik@summareconbandung.id",
      policyNote:
        "Pintu ditutup 30 menit setelah pertunjukan dimulai demi menjaga suasana konser akustik.",
      status: "PUBLISHED",
      layout: ev2Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev2VipZone, ev2RegZone] = await Promise.all([
    prisma.zone.create({
      data: {
        eventId: event2.id,
        name: "Ring 1 VIP",
        color: "#F43F5E",
        price: 150000,
        sortOrder: 1,
      },
    }),
    prisma.zone.create({
      data: {
        eventId: event2.id,
        name: "Ring 2–3 Reguler",
        color: "#14B8A6",
        price: 100000,
        sortOrder: 2,
      },
    }),
  ]);

  const ev2SoldIndex = new Map(EVENT2_SOLD_LABELS.map((l, i) => [l, i]));
  const ev2OrdersData = EVENT2_SOLD_LABELS.map((label, i) => {
    const rowLabel = label.split("-")[0];
    const price = rowLabel === "R1" ? ev2VipZone.price : ev2RegZone.price;
    const paidAt = new Date(now.getTime() - (20 - i) * 20 * 60 * 1000);
    return {
      id: `ord_demo_ev2_${String(i + 1).padStart(2, "0")}`,
      eventId: event2.id,
      buyerName: DEMO_BUYER_NAMES[(i + 3) % DEMO_BUYER_NAMES.length],
      buyerPhone: `628132026${String(200 + i)}`,
      status: "PAID" as const,
      totalAmount: price,
      holdToken: `hold_ev2_sold_${i + 1}`,
      holdExpiresAt: new Date(paidAt.getTime() + 10 * 60 * 1000),
      paymentRef: `SIM-EV2-${String(i + 1).padStart(3, "0")}`,
      paidAt,
      waStatus: "SKIPPED" as const,
    };
  });

  await prisma.order.createMany({ data: ev2OrdersData });

  await prisma.seat.createMany({
    data: ev2Seats.map((s) => {
      const soldIdx = ev2SoldIndex.get(s.label);
      const zoneId = s.rowLabel === "R1" ? ev2VipZone.id : ev2RegZone.id;
      if (soldIdx !== undefined) {
        const ord = ev2OrdersData[soldIdx];
        return {
          eventId: event2.id,
          zoneId,
          label: s.label,
          rowLabel: s.rowLabel,
          number: s.number,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          status: "SOLD" as const,
          orderId: ord.id,
          holdToken: ord.holdToken,
        };
      }
      return {
        eventId: event2.id,
        zoneId,
        label: s.label,
        rowLabel: s.rowLabel,
        number: s.number,
        x: s.x,
        y: s.y,
        rotation: s.rotation,
        status: "AVAILABLE" as const,
      };
    }),
  });

  const ev2SoldSeats = await prisma.seat.findMany({
    where: { eventId: event2.id, status: "SOLD" },
  });
  const ev2SeatIdByLabel = new Map(ev2SoldSeats.map((s) => [s.label, s.id]));

  await prisma.ticket.createMany({
    data: EVENT2_SOLD_LABELS.map((label, i) => ({
      orderId: ev2OrdersData[i].id,
      eventId: event2.id,
      seatId: ev2SeatIdByLabel.get(label)!,
      code: deterministicTicketCode("MAM", i + 1),
      status: i < 3 ? ("USED" as const) : ("VALID" as const),
      checkedInAt: i < 3 ? new Date(now.getTime() - 10 * 60 * 1000) : null,
      checkedInBy: i < 3 ? org1.id : null,
    })),
  });

  // =========================================================================
  // EVENT 3: Draft Demo
  // =========================================================================
  const ev3StartsAt = new Date(now.getTime() + 14 * day);
  await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "workshop-desain-produk-bandung",
      name: "Workshop Desain Produk & AI Bandung",
      description:
        "Sesi praktik langsung merancang produk digital bersama komunitas kreator Bandung.",
      venueName: "Creative Hub Lt. 1, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      startsAt: ev3StartsAt,
      gateOpenAt: new Date(ev3StartsAt.getTime() - 1 * hour),
      gateCloseAt: new Date(ev3StartsAt.getTime() + 2 * hour),
      salesOpenAt: new Date(now.getTime() - 1 * day),
      salesCloseAt: new Date(ev3StartsAt.getTime() - 1 * day),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp Panitia: 0812-2026-7700",
      policyNote: "Draft acara contoh untuk demonstrasi pembuatan layout.",
      status: "DRAFT",
    },
  });

  console.log("Seed lengkap berhasil:");
  console.log(`- Organizer: ${org1.email}, ${org2.email} (sandi: demo1234)`);
  console.log(
    `- Event 1 (${event1.slug}): ${ev1Seats.length} kursi, ${EVENT1_SOLD_LABELS.length} SOLD, 1 HELD (B-5), E-5 AVAILABLE`
  );
  console.log(`  Tiket demo: DEMO000VLD (VALID, kursi C-8), DEMO000USD (USED, kursi C-9)`);
  console.log(
    `- Event 2 (${event2.slug}): ${ev2Seats.length} kursi melingkar, ${EVENT2_SOLD_LABELS.length} SOLD`
  );
  console.log(`- Event 3 (workshop-desain-produk-bandung): DRAFT`);
}

main()
  .catch((err) => {
    console.error("Seed gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
