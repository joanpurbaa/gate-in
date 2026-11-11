"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  const callbackUrl = searchParams.get("callbackUrl") || "/my-tickets";

  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Lupa Password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Jika pengguna sudah login, arahkan langsung ke halaman tujuan
  const { data: session } = authClient.useSession();
  useEffect(() => {
    if (session?.user) {
      router.push(callbackUrl);
    }
  }, [session, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === "register") {
        if (!name.trim()) {
          setError("Nama lengkap wajib diisi.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password minimal harus 6 karakter.");
          setLoading(false);
          return;
        }

        const res = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          const msg = res.error.message || "";
          if (
            msg.toLowerCase().includes("already exists") ||
            msg.toLowerCase().includes("terdaftar") ||
            res.error.status === 422 ||
            res.error.status === 409
          ) {
            setError(
              "Email ini sudah terdaftar di GateIn. Silakan beralih ke tab 'Masuk' di atas."
            );
            setTab("login");
          } else {
            setError(msg || "Gagal membuat akun.");
          }
          setLoading(false);
          return;
        }

        setSuccess("Akun berhasil dibuat! Mengalihkan...");
      } else {
        const res = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          setError("Email atau password tidak cocok. Silakan periksa kembali.");
          setLoading(false);
          return;
        }

        setSuccess("Berhasil masuk! Mengalihkan...");
      }

      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      setLoading(false);
    }
  };

  const handleSocial = async (provider: "google" | "facebook") => {
    setError(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: typeof window !== "undefined" ? window.location.origin + callbackUrl : callbackUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan OAuth.";
      setError(
        msg.includes("not found") || msg.includes("Provider")
          ? `Login ${provider} belum dikonfigurasi di server.`
          : msg
      );
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = forgotEmail.trim().toLowerCase();
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setForgotError("Format email tidak valid.");
      return;
    }

    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);

    try {
      await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mail,
          redirectTo: typeof window !== "undefined" ? window.location.origin + "/login" : "/login",
        }),
      });

      setForgotMessage(
        "Jika email Anda terdaftar di GateIn, petunjuk pemulihan kata sandi telah dikirimkan ke kotak masuk Anda."
      );
    } catch {
      setForgotError("Gagal memproses permohonan. Coba kembali beberapa saat lagi.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 rounded-xl bg-page p-1 border border-line">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setError(null);
            setSuccess(null);
          }}
          className={`rounded-lg py-2 text-xs font-bold text-center transition ${
            tab === "login"
              ? "bg-gate text-white shadow-xs"
              : "text-muted hover:text-ink"
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError(null);
            setSuccess(null);
          }}
          className={`rounded-lg py-2 text-xs font-bold text-center transition ${
            tab === "register"
              ? "bg-gate text-white shadow-xs"
              : "text-muted hover:text-ink"
          }`}
        >
          Daftar Akun
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {tab === "register" && (
          <div>
            <label className="block text-xs font-semibold text-ink">
              Nama Lengkap
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="h-10 w-full rounded-input border border-line bg-page pl-9.5 pr-3 text-xs text-ink focus:border-gate focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink">
            Alamat Email
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="h-10 w-full rounded-input border border-line bg-page pl-9.5 pr-3 text-xs text-ink focus:border-gate focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink">
              Kata Sandi
            </label>
            {tab === "login" && (
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setIsForgotModalOpen(true);
                }}
                className="text-[11px] font-semibold text-gate hover:underline"
              >
                Lupa kata sandi?
              </button>
            )}
          </div>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
              <KeyRound className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "Minimal 6 karakter" : "Masukkan kata sandi"}
              className="h-10 w-full rounded-input border border-line bg-page pl-9.5 pr-10 text-xs text-ink focus:border-gate focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-gate px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-gate-strong transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>{tab === "login" ? "Masuk ke GateIn" : "Daftar Akun Baru"}</span>
          )}
        </button>
      </form>

      {/* Social OAuth Separator */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-card px-2 font-semibold text-muted">
            atau lanjutkan dengan
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-ink hover:bg-line/40 disabled:opacity-50 transition shadow-2xs"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleSocial("facebook")}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-ink hover:bg-line/40 disabled:opacity-50 transition shadow-2xs"
        >
          <svg className="h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </button>
      </div>

      {/* Modal Dialog Lupa Password */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-60 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-[24px] border border-line bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3
                id="forgot-password-title"
                className="font-display text-base font-bold text-ink"
              >
                Atur Ulang Kata Sandi
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotMessage(null);
                  setForgotError(null);
                }}
                className="rounded-full p-1 text-muted hover:bg-page hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink">
                  Email akun
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="mt-1 h-9.5 w-full rounded-input border border-line bg-page px-3 text-xs text-ink focus:border-gate focus:outline-none"
                />
              </div>

              {forgotError && (
                <p className="text-[11px] text-rose-700 font-medium">
                  {forgotError}
                </p>
              )}
              {forgotMessage && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  {forgotMessage}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="flex-1 rounded-button border border-line bg-card py-2 text-xs font-semibold text-muted hover:bg-page"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail.trim()}
                  className="flex-1 rounded-button bg-gate py-2 text-xs font-bold text-white hover:bg-gate-strong disabled:opacity-50"
                >
                  {forgotLoading ? "Mengirim..." : "Kirim Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
