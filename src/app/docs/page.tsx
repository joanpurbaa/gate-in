import type { Metadata } from "next";
import { DocsClient } from "./DocsClient";

export const metadata: Metadata = {
  title: "Panduan Penggunaan — GateIn",
  description: "Panduan lengkap penggunaan GateIn untuk pengunjung dan penyelenggara acara di Bandung.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
