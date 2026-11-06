"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("panitia@demo.id");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Gagal menghubungi server.");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Kembali ke beranda pengunjung</span>
      </Link>

      <div className="rounded-card border border-line bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <Logo size="md" />
          <span className="rounded-full bg-gate/10 px-3 py-1 text-xs font-semibold text-gate">
            Panitia
          </span>
        </div>
        <div className="mt-3">
          <h1 className="font-display text-lg font-bold text-ink">Masuk sebagai penyelenggara</h1>
          <p className="text-xs text-muted">
            Kelola acara, denah kursi, dan check-in QR peserta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-ink">
              Email penyelenggara
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-input border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-gate focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-ink">
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-input border border-line bg-card px-3.5 py-2.5 text-sm text-ink focus:border-gate focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-input border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white transition hover:bg-gate-strong disabled:bg-line disabled:text-muted"
          >
            {loading ? "Memverifikasi..." : "Masuk ke dasbor panitia"}
          </button>
        </form>

        <div className="mt-5 rounded-input border border-line bg-page p-3.5 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <KeyRound className="h-3.5 w-3.5 text-gate" />
            <span>Akun demo penilaian juri</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("panitia@demo.id");
                setPassword("demo1234");
              }}
              className="rounded-button border border-line bg-card px-2.5 py-1 text-xs font-semibold text-ink hover:bg-line/40"
            >
              Isi akun utama (panitia@demo.id)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("panitia2@demo.id");
                setPassword("demo1234");
              }}
              className="rounded-button border border-line bg-card px-2.5 py-1 text-xs font-semibold text-ink hover:bg-line/40"
            >
              Isi akun kosong (panitia2@demo.id)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
