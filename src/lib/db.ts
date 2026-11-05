import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Node 22+ punya WebSocket global; dipakai driver Neon untuk transaksi interaktif.
if (typeof WebSocket !== "undefined" && !neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = WebSocket;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur");
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Satu instance Prisma, aman untuk hot reload dev dan serverless. */
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
