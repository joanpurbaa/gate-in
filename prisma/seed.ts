import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { buildLayout, layoutToSeats } from "../src/lib/layout/generate.ts";

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
  "Aditya Rahman",
  "Citra Wulandari",
  "Rizky Hidayat",
  "Maya Indah",
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

/**
 * Menghitung Date UTC dari waktu WIB (Asia/Jakarta, UTC+7) bulat.
 * daysOffset dihitung dari tanggal hari seed dijalankan (berdasarkan kalender WIB).
 */
function getWibDateTime(daysOffset: number, wibHour: number, wibMinute: number = 0): Date {
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffsetMs);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const date = wibNow.getUTCDate();

  // WIB = UTC+7, jadi UTC hour = wibHour - 7
  return new Date(Date.UTC(year, month, date + daysOffset, wibHour - 7, wibMinute, 0, 0));
}

const SEED_SLUGS = [
  "bandung-tech-summit-2026",
  "malam-akustik-melingkar",
  "ketawa-kota-kembang",
  "simfoni-kota-orkestra-muda",
  "pentas-wayang-golek-reimagined",
  "workshop-fotografi-jalanan",
  "career-talk-jalur-kerja-2027",
  "festival-kopi-priangan-cupping",
  "workshop-desain-produk-bandung",
];

const EVENT1_SOLD_LABELS = [
  "A-4", "A-5", "A-10", "A-11", "A-15",
  "B-8", "B-9", "B-12", "B-13",
  "C-3", "C-8", "C-9",
  "D-5", "D-6", "D-14", "D-15",
  "E-9", "E-10", "E-11",
  "F-2", "F-3", "F-12", "F-13",
  "G-7", "G-8", "G-16",
  "H-4", "H-5", "H-10", "H-11",
  "I-9", "I-10",
  "J-6", "J-7",
  "K-11", "K-12",
  "L-8", "L-9",
  "M-10", "N-10",
];

const EVENT2_SOLD_LABELS = [
  "R1-01", "R1-02", "R1-07", "R1-08", "R1-14", "R1-15",
  "R2-03", "R2-04", "R2-12", "R2-13", "R2-20",
  "R3-05", "R3-06", "R3-18", "R3-19", "R3-27", "R3-28", "R3-33", "R3-34", "R2-28",
];

async function main() {
  const now = new Date();
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

  await prisma.organizer.upsert({
    where: { email: "panitia2@demo.id" },
    update: { name: "Panitia Komunitas Kreatif", passwordHash },
    create: {
      email: "panitia2@demo.id",
      name: "Panitia Komunitas Kreatif",
      passwordHash,
    },
  });

  // Hapus HANYA acara demo resmi, acara buatan manual pengguna tidak tersentuh
  await prisma.event.deleteMany({
    where: { slug: { in: SEED_SLUGS } },
  });

  // Waktu umum: penjualan dibuka 3 hari lalu pk 08.00 WIB
  const defaultSalesOpenAt = getWibDateTime(-3, 8, 0);

  // Helper untuk membuat order + kursi + tiket secara konsisten
  async function populateSeatsAndOrders({
    eventId,
    seats,
    zones,
    zoneChooser,
    soldLabels,
    ticketPrefix,
    demoTickets,
    heldSeat,
  }: {
    eventId: string;
    seats: ReturnType<typeof layoutToSeats>;
    zones: { id: string; price: number }[];
    zoneChooser: (seat: (typeof seats)[0]) => { id: string; price: number };
    soldLabels: string[];
    ticketPrefix: string;
    demoTickets?: { label: string; code: string; buyerName: string; isUsed: boolean }[];
    heldSeat?: { label: string; holdToken: string; expiresAt: Date; buyerName: string; buyerPhone: string };
  }) {
    const soldSet = new Set(soldLabels);
    const demoMap = new Map((demoTickets ?? []).map((d) => [d.label, d]));

    interface SeedOrderInput {
      id: string;
      eventId: string;
      buyerName: string;
      buyerPhone: string;
      status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
      totalAmount: number;
      holdToken: string;
      holdExpiresAt: Date;
      paymentRef: string | null;
      paidAt: Date | null;
      waStatus: "SENT" | "FAILED" | "SKIPPED" | null;
    }

    // Buat data pesanan untuk setiap kursi terjual
    const ordersData: SeedOrderInput[] = soldLabels.map((label, idx) => {
      const seat = seats.find((s) => s.label === label);
      const zone = seat ? zoneChooser(seat) : zones[0];
      const demo = demoMap.get(label);
      const paidAt = new Date(now.getTime() - (soldLabels.length - idx) * 15 * 60 * 1000);
      const buyerName = demo ? demo.buyerName : DEMO_BUYER_NAMES[idx % DEMO_BUYER_NAMES.length];

      return {
        id: demo
          ? `ord_demo_${demo.code.toLowerCase()}`
          : `ord_${ticketPrefix.toLowerCase()}_${String(idx + 1).padStart(3, "0")}`,
        eventId,
        buyerName,
        buyerPhone: `628122026${String(100 + (idx % 899))}`,
        status: "PAID" as const,
        totalAmount: zone.price,
        holdToken: `tok_${ticketPrefix.toLowerCase()}_sold_${idx + 1}`,
        holdExpiresAt: new Date(paidAt.getTime() + 10 * 60 * 1000),
        paymentRef: `SIM-${ticketPrefix}-${String(idx + 1).padStart(3, "0")}`,
        paidAt,
        waStatus: "SKIPPED" as const,
      };
    });

    // Tambah order held jika ada
    let heldOrderId: string | null = null;
    if (heldSeat) {
      heldOrderId = `ord_${ticketPrefix.toLowerCase()}_held`;
      const seat = seats.find((s) => s.label === heldSeat.label);
      const zone = seat ? zoneChooser(seat) : zones[0];
      ordersData.push({
        id: heldOrderId,
        eventId,
        buyerName: heldSeat.buyerName,
        buyerPhone: heldSeat.buyerPhone,
        status: "PENDING" as const,
        totalAmount: zone.price,
        holdToken: heldSeat.holdToken,
        holdExpiresAt: heldSeat.expiresAt,
        paymentRef: null,
        paidAt: null,
        waStatus: null,
      });
    }

    await prisma.order.createMany({ data: ordersData });

    // Buat kursi
    await prisma.seat.createMany({
      data: seats.map((s) => {
        const zone = zoneChooser(s);
        const isSold = soldSet.has(s.label);
        const isHeld = heldSeat && s.label === heldSeat.label;

        if (isSold) {
          const soldIdx = soldLabels.indexOf(s.label);
          const ord = ordersData[soldIdx];
          return {
            eventId,
            zoneId: zone.id,
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

        if (isHeld && heldSeat) {
          return {
            eventId,
            zoneId: zone.id,
            label: s.label,
            rowLabel: s.rowLabel,
            number: s.number,
            x: s.x,
            y: s.y,
            rotation: s.rotation,
            status: "HELD" as const,
            heldUntil: heldSeat.expiresAt,
            holdToken: heldSeat.holdToken,
            orderId: heldOrderId,
          };
        }

        return {
          eventId,
          zoneId: zone.id,
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

    // Ambil ID kursi sold
    const dbSoldSeats = await prisma.seat.findMany({
      where: { eventId, status: "SOLD" },
      select: { id: true, label: true },
    });
    const seatIdByLabel = new Map(dbSoldSeats.map((s) => [s.label, s.id]));

    // Buat tiket untuk setiap kursi sold
    const ticketsData = soldLabels.map((label, idx) => {
      const demo = demoMap.get(label);
      const isUsed = demo ? demo.isUsed : idx % 7 === 0; // Sebagian kecil USED
      const code = demo ? demo.code : deterministicTicketCode(ticketPrefix, idx + 1);
      const seatId = seatIdByLabel.get(label)!;
      const orderId = ordersData[idx].id;

      return {
        orderId,
        eventId,
        seatId,
        code,
        status: isUsed ? ("USED" as const) : ("VALID" as const),
        checkedInAt: isUsed ? new Date(now.getTime() - (idx + 1) * 12 * 60 * 1000) : null,
        checkedInBy: isUsed ? org1.id : null,
      };
    });

    await prisma.ticket.createMany({ data: ticketsData });
  }

  // =========================================================================
  // 1. Bandung Tech Summit 2026 (Grid 15x20 = 300 kursi) - Unggulan
  // =========================================================================
  const ev1StartsAt = getWibDateTime(7, 9, 0); // +7 hari, 09.00 WIB
  const ev1Layout = buildLayout(
    {
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
    },
    {
      stageLabel: "PANGGUNG UTAMA",
      labels: [
        { x: 110, y: 58, text: "Pintu Masuk Barat" },
        { x: 640, y: 58, text: "Pintu Masuk Timur" },
      ],
    }
  );
  const ev1Seats = layoutToSeats(ev1Layout);

  const event1 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "bandung-tech-summit-2026",
      name: "Bandung Tech Summit 2026",
      organizerName: "Priangan Tech Collective",
      category: "TECH",
      isFeatured: true,
      description:
        "Konferensi teknologi dan produk digital tahunan di Summarecon Mall Bandung. Menghadirkan praktisi engineering, AI, dan desain produk dari ekosistem teknologi Bandung. Pilih kursi Anda langsung dari denah ruangan 1:1.",
      venueName: "Convention Hall Lt. 2, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/bandung-tech-summit-2026.webp",
      startsAt: ev1StartsAt,
      gateOpenAt: new Date(ev1StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev1StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev1StartsAt.getTime() - 2 * 60 * 60 * 1000),
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
      data: { eventId: event1.id, name: "VIP", color: "#E14D2A", price: 150000, sortOrder: 1 },
    }),
    prisma.zone.create({
      data: { eventId: event1.id, name: "Reguler", color: "#0EA5E9", price: 75000, sortOrder: 2 },
    }),
  ]);

  await populateSeatsAndOrders({
    eventId: event1.id,
    seats: ev1Seats,
    zones: [ev1VipZone, ev1RegZone],
    zoneChooser: (s) => (["A", "B", "C"].includes(s.rowLabel) ? ev1VipZone : ev1RegZone),
    soldLabels: EVENT1_SOLD_LABELS,
    ticketPrefix: "BTS",
    demoTickets: [
      { label: "C-8", code: "DEMO000VLD", buyerName: "Budi Demo", isUsed: false },
      { label: "C-9", code: "DEMO000USD", buyerName: "Siti Admin", isUsed: true },
    ],
    heldSeat: {
      label: "B-5",
      holdToken: "tok_demo_held_b5",
      expiresAt: new Date(now.getTime() + 45 * 60 * 1000),
      buyerName: "Iwan Pembeli Held",
      buyerPhone: "628122026005",
    },
  });

  // =========================================================================
  // 2. Malam Akustik Melingkar (Lingkaran 24+32+40 = 96 kursi) - Unggulan
  // =========================================================================
  const ev2StartsAt = getWibDateTime(10, 19, 30); // +10 hari, 19.30 WIB
  const ev2Layout = buildLayout(
    {
      type: "circle",
      params: {
        rings: 3,
        seatsPerRing: [24, 32, 40],
        aisleGaps: 2,
        gapSizeSeats: 2,
        startAngleDeg: 0,
      },
      removedLabels: [],
    },
    { stageLabel: "PANGGUNG AKUSTIK", stageShape: "ellipse" }
  );
  const ev2Seats = layoutToSeats(ev2Layout);

  const event2 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "malam-akustik-melingkar",
      name: "Malam Akustik Melingkar",
      organizerName: "Senja Sessions",
      category: "MUSIC",
      isFeatured: true,
      description:
        "Pertunjukan musik akustik intim dengan format panggung di tengah penonton (in-the-round). Menikmati harmoni petikan gitar dan vokal berjarak dekat.",
      venueName: "Atrium Sawarga Courtyard, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/malam-akustik-melingkar.webp",
      startsAt: ev2StartsAt,
      gateOpenAt: new Date(ev2StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev2StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev2StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "Instagram: @senjasessions • WhatsApp: 0812-2026-9900",
      policyNote: "Penonton disarankan hadir 30 menit sebelum acara.",
      status: "PUBLISHED",
      layout: ev2Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev2VipZone, ev2RegZone] = await Promise.all([
    prisma.zone.create({
      data: { eventId: event2.id, name: "Ring 1 VIP", color: "#E14D2A", price: 150000, sortOrder: 1 },
    }),
    prisma.zone.create({
      data: { eventId: event2.id, name: "Ring 2–3 Reguler", color: "#10B981", price: 100000, sortOrder: 2 },
    }),
  ]);

  await populateSeatsAndOrders({
    eventId: event2.id,
    seats: ev2Seats,
    zones: [ev2VipZone, ev2RegZone],
    zoneChooser: (s) => (s.rowLabel === "R1" ? ev2VipZone : ev2RegZone),
    soldLabels: EVENT2_SOLD_LABELS,
    ticketPrefix: "MAM",
  });

  // =========================================================================
  // 3. Ketawa Kota Kembang: Malam Stand-up (Grid 10x16 = 160 kursi, ~60% terjual) - Unggulan
  // =========================================================================
  const ev3StartsAt = getWibDateTime(5, 19, 0); // +5 hari, 19.00 WIB
  const ev3Layout = buildLayout(
    {
      type: "grid",
      params: {
        rows: 10,
        cols: 16,
        rowLabelStyle: "alpha",
        aisleAfterCols: [8],
        aisleAfterRows: [],
        stagePosition: "top",
      },
      removedLabels: [],
    },
    { stageLabel: "PANGGUNG STAND-UP" }
  );
  const ev3Seats = layoutToSeats(ev3Layout);

  const event3 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "ketawa-kota-kembang",
      name: "Ketawa Kota Kembang: Malam Stand-up",
      organizerName: "Kembang Komedi",
      category: "ARTS",
      isFeatured: true,
      description:
        "Malam komedi tunggal terkurasi dari deretan komika terbaik Jawa Barat. Suasana santai dan penuh tawa di panggung terbuka lantai LG.",
      venueName: "Open Stage Lt. LG, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/ketawa-kota-kembang.webp",
      startsAt: ev3StartsAt,
      gateOpenAt: new Date(ev3StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev3StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev3StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp: 0812-2026-3300 • IG: @kembangkomedi",
      policyNote: "Khusus penonton usia 15 tahun ke atas. Dilarang membawa makanan dan minuman dari luar.",
      status: "PUBLISHED",
      layout: ev3Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev3VipZone, ev3RegZone] = await Promise.all([
    prisma.zone.create({
      data: { eventId: event3.id, name: "VIP", color: "#F59E0B", price: 135000, sortOrder: 1 },
    }),
    prisma.zone.create({
      data: { eventId: event3.id, name: "Reguler", color: "#0EA5E9", price: 85000, sortOrder: 2 },
    }),
  ]);

  // ~60% terjual dari 160 kursi = 96 kursi
  const ev3SoldLabels = ev3Seats
    .filter((_, idx) => idx % 5 !== 0 && idx % 7 !== 2)
    .slice(0, 96)
    .map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event3.id,
    seats: ev3Seats,
    zones: [ev3VipZone, ev3RegZone],
    zoneChooser: (s) => (["A", "B"].includes(s.rowLabel) ? ev3VipZone : ev3RegZone),
    soldLabels: ev3SoldLabels,
    ticketPrefix: "KKK",
  });

  // =========================================================================
  // 4. Simfoni Kota: Orkestra Muda Bandung (Grid 12x18 = 216 kursi, ~35% terjual) - Unggulan
  // =========================================================================
  const ev4StartsAt = getWibDateTime(14, 16, 0); // +14 hari, 16.00 WIB
  const ev4Layout = buildLayout(
    {
      type: "grid",
      params: {
        rows: 12,
        cols: 18,
        rowLabelStyle: "alpha",
        aisleAfterCols: [9],
        aisleAfterRows: [],
        stagePosition: "top",
      },
      removedLabels: [],
    },
    { stageLabel: "PANGGUNG ORKESTRA" }
  );
  const ev4Seats = layoutToSeats(ev4Layout);

  const event4 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "simfoni-kota-orkestra-muda",
      name: "Simfoni Kota: Orkestra Muda Bandung",
      organizerName: "Bandung Youth Orchestra",
      category: "MUSIC",
      isFeatured: true,
      description:
        "Pertunjukan orkestra membawakan aransemen simfoni lagu-lagu daerah Parahyangan dan komposisi kontemporer oleh 50 musisi muda berbakat.",
      venueName: "Convention Hall Lt. 2, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/simfoni-kota-orkestra-muda.webp",
      startsAt: ev4StartsAt,
      gateOpenAt: new Date(ev4StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev4StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev4StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "info@bandungorchestra.id • WhatsApp: 0812-2026-4400",
      policyNote: "Dress code formal / semi formal. Penonton dilarang keluar masuk saat lagu berlangsung.",
      status: "PUBLISHED",
      layout: ev4Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev4VipZone, ev4RegZone] = await Promise.all([
    prisma.zone.create({
      data: { eventId: event4.id, name: "VIP", color: "#8B5CF6", price: 175000, sortOrder: 1 },
    }),
    prisma.zone.create({
      data: { eventId: event4.id, name: "Reguler", color: "#0EA5E9", price: 90000, sortOrder: 2 },
    }),
  ]);

  // ~35% terjual dari 216 kursi = 76 kursi
  const ev4SoldLabels = ev4Seats
    .filter((_, idx) => idx % 3 === 0 || idx % 7 === 1)
    .slice(0, 76)
    .map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event4.id,
    seats: ev4Seats,
    zones: [ev4VipZone, ev4RegZone],
    zoneChooser: (s) => (["A", "B", "C", "D"].includes(s.rowLabel) ? ev4VipZone : ev4RegZone),
    soldLabels: ev4SoldLabels,
    ticketPrefix: "SKO",
  });

  // =========================================================================
  // 5. Pentas Wayang Golek Reimagined (Lingkaran 18+26+34 = 78 kursi, ~20% terjual) - Unggulan
  // =========================================================================
  const ev5StartsAt = getWibDateTime(12, 15, 0); // +12 hari, 15.00 WIB
  const ev5Layout = buildLayout(
    {
      type: "circle",
      params: {
        rings: 3,
        seatsPerRing: [18, 26, 34],
        aisleGaps: 2,
        gapSizeSeats: 2,
        startAngleDeg: 0,
      },
      removedLabels: [],
    },
    { stageLabel: "PANGGUNG WAYANG", stageShape: "ellipse" }
  );
  const ev5Seats = layoutToSeats(ev5Layout);

  const event5 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "pentas-wayang-golek-reimagined",
      name: "Pentas Wayang Golek Reimagined",
      organizerName: "Sanggar Sekar Priangan",
      category: "ARTS",
      isFeatured: true,
      description:
        "Pertunjukan seni wayang golek kontemporer dengan perpaduan tata cahaya modern dan narasi dwibahasa Sunda-Indonesia yang memikat seluruh generasi.",
      venueName: "Atrium Sawarga Courtyard, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/pentas-wayang-golek-reimagined.webp",
      startsAt: ev5StartsAt,
      gateOpenAt: new Date(ev5StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev5StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev5StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp: 0812-2026-5500 • info@sekar-priangan.org",
      policyNote: "Tiket termasuk suvenir wayang mini khas sanggar untuk setiap penonton.",
      status: "PUBLISHED",
      layout: ev5Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const [ev5VipZone, ev5RegZone] = await Promise.all([
    prisma.zone.create({
      data: { eventId: event5.id, name: "Ring 1 VIP", color: "#F59E0B", price: 120000, sortOrder: 1 },
    }),
    prisma.zone.create({
      data: { eventId: event5.id, name: "Ring 2–3 Reguler", color: "#10B981", price: 80000, sortOrder: 2 },
    }),
  ]);

  // ~20% terjual dari 78 kursi = 16 kursi
  const ev5SoldLabels = ev5Seats
    .filter((_, idx) => idx % 5 === 0)
    .slice(0, 16)
    .map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event5.id,
    seats: ev5Seats,
    zones: [ev5VipZone, ev5RegZone],
    zoneChooser: (s) => (s.rowLabel === "R1" ? ev5VipZone : ev5RegZone),
    soldLabels: ev5SoldLabels,
    ticketPrefix: "PWG",
  });

  // =========================================================================
  // 6. Workshop Fotografi Jalanan Bandung (Grid 6x10 = 60 kursi, 48 terjual, sisa tepat 12 kursi / 20%)
  // =========================================================================
  const ev6StartsAt = getWibDateTime(6, 13, 0); // +6 hari, 13.00 WIB
  const ev6Layout = buildLayout(
    {
      type: "grid",
      params: {
        rows: 6,
        cols: 10,
        rowLabelStyle: "alpha",
        aisleAfterCols: [],
        aisleAfterRows: [],
        stagePosition: "top",
      },
      removedLabels: [],
    },
    { stageLabel: "AREA INSTRUKTUR" }
  );
  const ev6Seats = layoutToSeats(ev6Layout);

  const event6 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "workshop-fotografi-jalanan",
      name: "Workshop Fotografi Jalanan Bandung",
      organizerName: "Lensa Kota",
      category: "EDUCATION",
      isFeatured: false,
      description:
        "Sesi mendalam teknik street photography, komposisi visual human interest, dan etika fotografi publik bersama fotografer senior Kota Bandung.",
      venueName: "Creative Hub Lt. 1, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/workshop-fotografi-jalanan.webp",
      startsAt: ev6StartsAt,
      gateOpenAt: new Date(ev6StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev6StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev6StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 3,
      contactInfo: "Instagram: @lensakota.bdg • WhatsApp: 0812-2026-6600",
      policyNote: "Peserta wajib membawa kamera mirrorless/DSLR atau ponsel kamera sendiri.",
      status: "PUBLISHED",
      layout: ev6Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const ev6RegZone = await prisma.zone.create({
    data: { eventId: event6.id, name: "Reguler", color: "#0EA5E9", price: 120000, sortOrder: 1 },
  });

  // Tepat 48 kursi terjual -> sisa 12 kursi (20% tersisa < 25%, memicu lencana Karcis "Sisa 12")
  const ev6SoldLabels = ev6Seats.slice(0, 48).map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event6.id,
    seats: ev6Seats,
    zones: [ev6RegZone],
    zoneChooser: () => ev6RegZone,
    soldLabels: ev6SoldLabels,
    ticketPrefix: "WFJ",
  });

  // =========================================================================
  // 7. Career Talk: Jalur Kerja 2027 (Grid 12x18 = 216 kursi, ~30% terjual)
  // =========================================================================
  const ev7StartsAt = getWibDateTime(9, 10, 0); // +9 hari, 10.00 WIB
  const ev7Layout = buildLayout(
    {
      type: "grid",
      params: {
        rows: 12,
        cols: 18,
        rowLabelStyle: "alpha",
        aisleAfterCols: [9],
        aisleAfterRows: [],
        stagePosition: "top",
      },
      removedLabels: [],
    },
    { stageLabel: "PANGGUNG UTAMA" }
  );
  const ev7Seats = layoutToSeats(ev7Layout);

  const event7 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "career-talk-jalur-kerja-2027",
      name: "Career Talk: Jalur Kerja 2027",
      organizerName: "Forum Karier Mahasiswa Bandung",
      category: "EDUCATION",
      isFeatured: false,
      description:
        "Panduan persiapan karier masa depan di era otomasi dan AI: pemetaan skill esensial, penulisan CV berbasis dampak, dan tips wawancara profesional.",
      venueName: "Convention Hall Lt. 2, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/career-talk-jalur-kerja-2027.webp",
      startsAt: ev7StartsAt,
      gateOpenAt: new Date(ev7StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev7StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev7StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp: 0812-2026-7700 • info@forumkarier.id",
      policyNote: "Tiket termasuk e-certificate dan modul ringkasan karier digital.",
      status: "PUBLISHED",
      layout: ev7Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const ev7RegZone = await prisma.zone.create({
    data: { eventId: event7.id, name: "Reguler", color: "#0EA5E9", price: 35000, sortOrder: 1 },
  });

  // ~30% terjual dari 216 kursi = 65 kursi
  const ev7SoldLabels = ev7Seats
    .filter((_, idx) => idx % 3 === 0 || idx % 11 === 0)
    .slice(0, 65)
    .map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event7.id,
    seats: ev7Seats,
    zones: [ev7RegZone],
    zoneChooser: () => ev7RegZone,
    soldLabels: ev7SoldLabels,
    ticketPrefix: "CTJ",
  });

  // =========================================================================
  // 8. Festival Kopi Priangan: Sesi Cupping (Grid 8x12 = 96 kursi, ~50% terjual)
  // =========================================================================
  const ev8StartsAt = getWibDateTime(4, 10, 0); // +4 hari, 10.00 WIB
  const ev8Layout = buildLayout(
    {
      type: "grid",
      params: {
        rows: 8,
        cols: 12,
        rowLabelStyle: "alpha",
        aisleAfterCols: [6],
        aisleAfterRows: [],
        stagePosition: "top",
      },
      removedLabels: [],
    },
    { stageLabel: "MEJA CUPPING UTAMA" }
  );
  const ev8Seats = layoutToSeats(ev8Layout);

  const event8 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "festival-kopi-priangan-cupping",
      name: "Festival Kopi Priangan: Sesi Cupping",
      organizerName: "Komunitas Ngopi Priangan",
      category: "COMMUNITY",
      isFeatured: false,
      description:
        "Eksplorasi cita rasa 12 varietas kopi arabika terbaik pegunungan Priangan Timur dan Barat dipandu Q-Grader bersertifikat internasional.",
      venueName: "Open Stage Lt. LG, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: "/posters/festival-kopi-priangan-cupping.webp",
      startsAt: ev8StartsAt,
      gateOpenAt: new Date(ev8StartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(ev8StartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(ev8StartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 4,
      contactInfo: "Instagram: @ngopipriangan • WhatsApp: 0812-2026-8811",
      policyNote: "Peserta diharapkan tidak memakai wewangian menyengat demi kenyamanan sesi olfaktori.",
      status: "PUBLISHED",
      layout: ev8Layout as unknown as object,
      layoutLocked: true,
    },
  });

  const ev8RegZone = await prisma.zone.create({
    data: { eventId: event8.id, name: "Reguler", color: "#10B981", price: 65000, sortOrder: 1 },
  });

  // ~50% terjual dari 96 kursi = 48 kursi
  const ev8SoldLabels = ev8Seats
    .filter((_, idx) => idx % 2 === 0)
    .slice(0, 48)
    .map((s) => s.label);

  await populateSeatsAndOrders({
    eventId: event8.id,
    seats: ev8Seats,
    zones: [ev8RegZone],
    zoneChooser: () => ev8RegZone,
    soldLabels: ev8SoldLabels,
    ticketPrefix: "FKP",
  });

  // =========================================================================
  // EVENT DRAFT: Workshop Desain Produk & AI Bandung (Draft untuk wizard)
  // =========================================================================
  const evDraftStartsAt = getWibDateTime(14, 14, 0);
  await prisma.event.create({
    data: {
      organizerId: org1.id,
      slug: "workshop-desain-produk-bandung",
      name: "Workshop Desain Produk & AI Bandung",
      organizerName: "Panitia Komunitas Kreatif",
      category: "TECH",
      isFeatured: false,
      description: "Sesi praktik langsung merancang produk digital bersama komunitas kreator Bandung.",
      venueName: "Creative Hub Lt. 1, Summarecon Mall Bandung",
      venueAddress: "Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung",
      posterUrl: null,
      startsAt: evDraftStartsAt,
      gateOpenAt: new Date(evDraftStartsAt.getTime() - 90 * 60 * 1000),
      gateCloseAt: new Date(evDraftStartsAt.getTime() + 30 * 60 * 1000),
      salesOpenAt: defaultSalesOpenAt,
      salesCloseAt: new Date(evDraftStartsAt.getTime() - 2 * 60 * 60 * 1000),
      maxSeatsPerOrder: 5,
      contactInfo: "WhatsApp Panitia: 0812-2026-7700",
      policyNote: "Draft acara contoh untuk demonstrasi pembuatan layout.",
      status: "DRAFT",
    },
  });

  console.log("Seed 8 acara realistis berhasil dijalankan!");
  console.log(`- 8 Acara Terbit + 1 Draft, seluruhnya dimiliki ${org1.email}`);
  console.log(`- Tiket demo tetap: DEMO000VLD (VALID, C-8) & DEMO000USD (USED, C-9)`);
  console.log(`- Kursi held tetap: B-5 di bandung-tech-summit-2026`);
  console.log(`- Kursi E-5, E-6, E-7 di bandung-tech-summit-2026 tetap AVAILABLE untuk skrip uji balapan`);
}

main()
  .catch((err) => {
    console.error("Seed gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
