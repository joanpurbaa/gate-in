import type { NextConfig } from "next";

if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason) => {
    console.error("=== UNHANDLED REJECTION DETAILS ===");
    console.error(reason);
    console.error("===================================");
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
