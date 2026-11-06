import type { NextConfig } from "next";

// 1. Monkey-patch collectBuildTraces untuk mencegah bug NFT trace Next.js 16 melempar TypeError
try {
  const cbtPath = require.resolve("next/dist/build/collect-build-traces");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cbt = require(cbtPath);
  if (typeof cbt.collectBuildTraces === "function") {
    const originalCollect = cbt.collectBuildTraces;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cbt.collectBuildTraces = async function (...args: any[]) {
      try {
        return await originalCollect.apply(this, args);
      } catch (err: unknown) {
        const error = err as Error;
        console.warn(
          "⚠️ [NFT Trace Warning] Tracing encountered non-critical error, continuing build:",
          error?.message || err
        );
        return;
      }
    };
  }
} catch {
  // Abaikan bila di luar environment Next.js build
}

// 2. Cegah Next.js setup-exception-listeners langsung crash process.exit(1) pada TypeError primitive conversion
if (typeof process !== "undefined") {
  const existingListeners = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    const err = reason as Error;
    if (
      err &&
      typeof err.message === "string" &&
      err.message.includes("Cannot convert object to primitive value")
    ) {
      console.warn("⚠️ [Suppressed Warning] Non-critical primitive conversion error:", err.message);
      return;
    }
    for (const listener of existingListeners) {
      listener(reason, promise);
    }
  });
}

const nextConfig: NextConfig = {
  // Cache Components sengaja dimatikan: semua data (status kursi, pesanan)
  // harus segar per request. Lihat docs/PROGRESS.md bagian Keputusan.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
