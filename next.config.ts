import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components sengaja dimatikan: semua data (status kursi, pesanan)
  // harus segar per request. Lihat docs/PROGRESS.md bagian Keputusan.
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
