import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.ts";

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

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
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

  console.log("Seed akun penyelenggara selesai:", org1.email, org2.email);
}

main()
  .catch((err) => {
    console.error("Seed gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
