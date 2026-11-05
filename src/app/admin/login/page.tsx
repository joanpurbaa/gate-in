"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

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
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Kembali ke Beranda Pengunjung</span>
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3730A3] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-stone-900">Login Penyelenggara</h1>
            <p className="text-xs text-stone-600">
              Kelola acara, denah kursi, dan check-in QR peserta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-stone-800">
              Email Penyelenggara
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#3730A3] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-stone-800">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#3730A3] focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-900 disabled:bg-stone-300"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Dashboard Panitia"}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-stone-200 bg-[#FAFAF7] p-3.5 text-xs text-stone-700">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900">
            <KeyRound className="h-3.5 w-3.5 text-[#3730A3]" />
            <span>Akun Demo Penilaian Juri</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("panitia@demo.id");
                setPassword("demo1234");
              }}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-100"
            >
              Isi Akun Utama (panitia@demo.id)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("panitia2@demo.id");
                setPassword("demo1234");
              }}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-100"
            >
              Isi Akun Kosong (panitia2@demo.id)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
