import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LoginFormClient } from "./LoginFormClient";

export const metadata = {
  title: "Masuk atau Daftar Akun — GateIn",
  description: "Masuk ke akun GateIn untuk mengakses seluruh tiket dan pesanan acara Anda.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      <div className="rounded-[24px] border border-line bg-card p-6 sm:p-8 shadow-xs">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <Logo size="md" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">
            Selamat Datang di GateIn
          </h1>
          <p className="mt-1 text-xs text-muted">
            Masuk atau buat akun untuk menyimpan dan mengakses seluruh tiket acara Anda.
          </p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-page" />}>
          <LoginFormClient />
        </Suspense>
      </div>
    </main>
  );
}
