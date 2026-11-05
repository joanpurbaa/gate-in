import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Muat .env lokal bila ada (di Vercel env sudah tersedia di process.env).
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

// CLI (migrate) memakai koneksi langsung/unpooled; runtime memakai DATABASE_URL (pooled) lewat adapter Neon.
const cliUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.ts",
  },
  datasource: cliUrl ? { url: cliUrl } : undefined,
});
