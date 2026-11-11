"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { authClient } from "@/lib/auth-client";
import type { SelectedSeatSummary } from "./SelectedSeatsBar";

export interface AppliedPromoInfo {
  code: string;
  name: string;
  discountAmount: number;
  finalTotal: number;
}

export interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    venueName: string;
    startsAt: string;
  };
  selectedSeats: SelectedSeatSummary[];
  onRemoveSeat: (label: string) => void;
  buyerName: string;
  onBuyerNameChange: (val: string) => void;
  buyerPhone: string;
  onBuyerPhoneChange: (val: string) => void;
  appliedPromo: AppliedPromoInfo | null;
  onApplyPromo: (promo: AppliedPromoInfo | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function CheckoutDrawer({
  isOpen,
  onClose,
  event,
  selectedSeats,
  onRemoveSeat,
  buyerName,
  onBuyerNameChange,
  buyerPhone,
  onBuyerPhoneChange,
  appliedPromo,
  onApplyPromo,
  onSubmit,
  isSubmitting,
  errorMessage,
}: CheckoutDrawerProps) {
  const subtotal = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const finalTotal = appliedPromo ? Math.max(0, subtotal - appliedPromo.discountAmount) : subtotal;

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Sesi Autentikasi Pengguna (Better Auth)
  const { data: session, isPending: isSessionLoading, refetch: refetchSession } = authClient.useSession();

  // Auth Form State
  const [authTab, setAuthTab] = useState<"register" | "login">("register");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Modal Lupa Password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Otomatis isi buyerName dari nama akun jika kosong saat session tersedia
  useEffect(() => {
    if (session?.user?.name && !buyerName.trim()) {
      onBuyerNameChange(session.user.name);
    }
  }, [session?.user?.name, buyerName, onBuyerNameChange]);

  // Validasi kode promo ke endpoint server
  const handleValidatePromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || isValidatingPromo) return;

    setPromoError(null);
    setIsValidatingPromo(true);

    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          promoCode: code,
          seatLabels: selectedSeats.map((s) => s.label),
          buyerPhone: buyerPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || "Kode promo tidak valid");
        return;
      }

      onApplyPromo({
        code: data.promo.code,
        name: data.promo.name,
        discountAmount: data.discountAmount,
        finalTotal: data.finalTotal,
      });
      setPromoInput("");
      setPromoError(null);
    } catch {
      setPromoError("Gagal memeriksa promo. Periksa koneksi internet Anda.");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Kunci scroll latar dan tangani Escape saat terbuka
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isAuthBusy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, isAuthBusy, onClose]);

  // Eksekusi Pendaftaran Akun Baru
  const executeRegister = async (): Promise<boolean> => {
    const name = buyerName.trim();
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!name) {
      setAuthError("Nama lengkap wajib diisi untuk pendaftaran akun.");
      return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Format email tidak valid. Masukkan alamat email yang benar.");
      return false;
    }
    if (!password || password.length < 6) {
      setAuthError("Password minimal harus 6 karakter.");
      return false;
    }

    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsAuthBusy(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        const errorMsg = result.error.message || "";
        if (
          errorMsg.toLowerCase().includes("already exists") ||
          errorMsg.toLowerCase().includes("terdaftar") ||
          result.error.status === 422 ||
          result.error.status === 409
        ) {
          setAuthError(
            "Email ini sudah terdaftar di GateIn. Silakan beralih ke tab 'Masuk' di atas untuk login."
          );
          setAuthTab("login");
        } else {
          setAuthError(result.error.message || "Gagal membuat akun. Silakan coba lagi.");
        }
        return false;
      }

      setAuthSuccessMsg("Akun berhasil dibuat! Anda telah masuk.");
      await refetchSession();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat pendaftaran akun.";
      setAuthError(msg);
      return false;
    } finally {
      setIsAuthBusy(false);
    }
  };

  // Eksekusi Masuk Akun
  const executeLogin = async (): Promise<boolean> => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Format email tidak valid.");
      return false;
    }
    if (!password) {
      setAuthError("Password wajib diisi.");
      return false;
    }

    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsAuthBusy(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setAuthError("Email atau password tidak cocok. Silakan periksa kembali.");
        return false;
      }

      setAuthSuccessMsg("Berhasil masuk ke akun GateIn.");
      await refetchSession();

      if (result.data?.user?.name && !buyerName.trim()) {
        onBuyerNameChange(result.data.user.name);
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat masuk akun.";
      setAuthError(msg);
      return false;
    } finally {
      setIsAuthBusy(false);
    }
  };

  // Eksekusi Login Sosial (Google / Facebook)
  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setAuthError(null);
    setIsAuthBusy(true);

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Gagal menghubungkan ke ${provider === "google" ? "Google" : "Facebook"}.`;
      setAuthError(
        msg.includes("not found") || msg.includes("Provider")
          ? `Login ${provider === "google" ? "Google" : "Facebook"} belum dikonfigurasi di server. Silakan gunakan tab Email & Password.`
          : msg
      );
      setIsAuthBusy(false);
    }
  };

  // Eksekusi Keluar Akun
  const handleSignOut = async () => {
    if (isAuthBusy || isSubmitting) return;
    setIsAuthBusy(true);
    try {
      await authClient.signOut();
      await refetchSession();
      setAuthSuccessMsg(null);
    } catch (err) {
      console.error("Gagal logout:", err);
    } finally {
      setIsAuthBusy(false);
    }
  };

  // Eksekusi Kirim Instruksi Lupa Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotError("Format email tidak valid.");
      return;
    }

    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);

    try {
      // Better auth forget password endpoint
      await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: typeof window !== "undefined" ? window.location.href : "/",
        }),
      });

      setForgotMessage(
        "Jika email Anda terdaftar di GateIn, petunjuk pemulihan kata sandi telah dikirimkan ke kotak masuk email Anda."
      );
    } catch {
      setForgotError("Gagal memproses permohonan. Silakan coba kembali sesaat lagi.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Intersepsi Form Submit Checkout
  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isAuthBusy) return;

    // Jika pengguna belum login, lakukan registrasi / login otomatis
    if (!session?.user) {
      if (!authEmail.trim() || !authPassword) {
        setAuthError(
          "Silakan buat akun atau masuk terlebih dahulu di bagian akun di atas agar tiket Anda tersimpan aman."
        );
        return;
      }

      if (authTab === "register") {
        const ok = await executeRegister();
        if (!ok) return;
      } else {
        const ok = await executeLogin();
        if (!ok) return;
      }
    }

    // Jika sudah terautentikasi, panggil handler konfirmasi & kunci kursi
    onSubmit(e);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-xs transition-opacity duration-200 sm:items-center sm:p-4"
    >
      {/* Backdrop click handler */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => {
          if (!isSubmitting && !isAuthBusy) onClose();
        }}
      />

      {/* Drawer / Modal Container */}
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] border-t border-line bg-card shadow-2xl transition-all sm:max-w-lg sm:rounded-[24px] sm:border">
        {/* Header Drawer */}
        <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
          <div className="pr-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gate">
              <Lock className="h-3.5 w-3.5" />
              <span>Checkout Terintegrasi</span>
            </div>
            <h2
              id="checkout-dialog-title"
              className="mt-0.5 font-display text-lg font-bold text-ink sm:text-xl"
            >
              Data Pemesan & Konfirmasi
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gate" />
                {formatDateTime(event.startsAt)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gate" />
                {event.venueName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isAuthBusy}
            aria-label="Tutup form checkout"
            className="rounded-full p-1.5 text-muted hover:bg-page hover:text-ink disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={handleDrawerSubmit} className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-6">
          <div className="space-y-5">
            {/* 1. Ringkasan Kursi & Zona */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>Kursi yang dipilih ({selectedSeats.length})</span>
                <span className="text-muted font-normal">Harga resmi</span>
              </div>

              <div className="mt-2 divide-y divide-line rounded-input border border-line bg-page">
                {selectedSeats.map((seat) => (
                  <div
                    key={seat.label}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-xs"
                        style={{ backgroundColor: seat.zoneColor }}
                      />
                      <span className="font-display font-bold text-ink">
                        Kursi {seat.label}
                      </span>
                      <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted border border-line">
                        Zona {seat.zoneName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-ink">
                        {formatRupiah(seat.price)}
                      </span>
                      {selectedSeats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveSeat(seat.label)}
                          disabled={isSubmitting || isAuthBusy}
                          aria-label={`Lepas kursi ${seat.label}`}
                          className="rounded-full p-1 text-muted hover:bg-line hover:text-ink disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Rincian Harga & Promo Code */}
                <div className="bg-card/60 px-3.5 py-3 space-y-2 text-xs">
                  {/* Form Input Promo jika belum terpasang */}
                  {!appliedPromo ? (
                    <div className="space-y-1.5 pb-1">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value.toUpperCase());
                              setPromoError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleValidatePromo();
                              }
                            }}
                            placeholder="Punya kode promo?"
                            disabled={isSubmitting || isValidatingPromo}
                            className="w-full rounded-input border border-line bg-card py-1.5 pl-8.5 pr-2.5 text-xs font-mono uppercase text-ink placeholder:font-sans placeholder:normal-case placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleValidatePromo}
                          disabled={!promoInput.trim() || isSubmitting || isValidatingPromo}
                          className="rounded-input bg-page px-3 py-1.5 text-xs font-bold text-ink border border-line hover:bg-gate/10 hover:text-gate disabled:opacity-50 transition"
                        >
                          {isValidatingPromo ? "Memeriksa..." : "Terapkan"}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-[11px] text-rose-700 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{promoError}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Badge Promo Diterapkan */
                    <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-emerald-700" />
                        <div>
                          <span className="font-mono font-bold tracking-wide">
                            {appliedPromo.code}
                          </span>
                          <span className="ml-1 text-[11px] text-emerald-800">
                            (Hemat {formatRupiah(appliedPromo.discountAmount)})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPromo(null);
                          setPromoInput("");
                          setPromoError(null);
                        }}
                        disabled={isSubmitting || isAuthBusy}
                        className="rounded-full p-1 text-emerald-800 hover:bg-emerald-200 transition"
                        title="Hapus promo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="flex items-center justify-between text-muted pt-1">
                    <span>Subtotal</span>
                    <span className="font-semibold text-ink">{formatRupiah(subtotal)}</span>
                  </div>

                  {/* Potongan Diskon */}
                  {appliedPromo && (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold">
                      <span>Potongan Diskon</span>
                      <span>-{formatRupiah(appliedPromo.discountAmount)}</span>
                    </div>
                  )}

                  {/* Total Pembayaran */}
                  <div className="flex items-center justify-between border-t border-line/60 pt-2 font-bold text-ink">
                    <span>Total Pembayaran</span>
                    <span className="font-display text-base font-extrabold text-gate">
                      {formatRupiah(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Formulir Data Diri Pemesan */}
            <div className="space-y-3.5">
              <div className="text-xs font-semibold text-ink">
                Informasi Kontak Pemesan
              </div>

              <div>
                <label
                  htmlFor="checkout-buyer-name"
                  className="block text-xs font-semibold text-ink"
                >
                  Nama lengkap peserta
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="checkout-buyer-name"
                    name="buyerName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isSubmitting || isAuthBusy}
                    placeholder="Contoh: Budi Santoso"
                    value={buyerName}
                    onChange={(e) => onBuyerNameChange(e.target.value)}
                    className="min-h-11 w-full rounded-input border border-line bg-card pl-9.5 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="checkout-buyer-phone"
                    className="block text-xs font-semibold text-ink"
                  >
                    Nomor WhatsApp aktif
                  </label>
                  <span className="text-[11px] font-bold text-gate">
                    Format: 08xxx (tanpa spasi)
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="checkout-buyer-phone"
                    name="buyerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    disabled={isSubmitting || isAuthBusy}
                    placeholder="Contoh: 081212341224 (tanpa spasi)"
                    value={buyerPhone}
                    onChange={(e) => onBuyerPhoneChange(e.target.value.replace(/[\s\-]/g, ""))}
                    className="min-h-11 w-full rounded-input border border-line bg-card pl-9.5 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                  />
                </div>
                <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50/90 p-2 text-[11px] text-amber-950">
                  <p className="font-semibold flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Wajib diawali <strong>08xx</strong> dan ditulis <strong>tanpa spasi</strong> (contoh: <code>081212341224</code>, bukan <code>0812 1234 1224</code>).</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-amber-900/90">
                    E-ticket dan QR code akan otomatis dikirimkan ke nomor WhatsApp ini setelah pembayaran.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. BAGIAN AUTENTIKASI (SETELAH NOMOR WHATSAPP) */}
            <div className="pt-1">
              {isSessionLoading ? (
                /* Loading State Sesi */
                <div className="flex items-center justify-center rounded-2xl border border-line bg-page/50 p-4 text-xs text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-gate" />
                  <span>Memeriksa status akun...</span>
                </div>
              ) : session?.user ? (
                /* B. KONDISI SUDAH LOGIN: Tampilkan Badge Akun Ringkas */
                <div className="rounded-2xl border border-gate/25 bg-gate/5 p-4 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gate text-sm font-bold text-white shadow-xs">
                        {session.user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={session.user.image}
                            alt={session.user.name || "Foto profil"}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          (session.user.name || session.user.email || "U")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-gate tracking-wide">
                            Login sebagai
                          </span>
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                        </div>
                        <p className="truncate font-display font-bold text-sm text-ink">
                          {session.user.name || "Pengguna GateIn"}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {session.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isAuthBusy || isSubmitting}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-900 transition disabled:opacity-50"
                      >
                        {isAuthBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                        <span>Ganti akun</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-gate/15 pt-2.5 text-[11px] text-muted">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Pesanan dan e-ticket otomatis terhubung ke akun Anda.
                    </span>
                  </div>
                </div>
              ) : (
                /* A. KONDISI BELUM LOGIN: Form Buat Akun / Masuk Terpadu */
                <div className="rounded-2xl border border-line bg-page/70 p-4 space-y-3.5">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4 text-gate shrink-0" />
                      <span>Buat akun atau masuk ke GateIn</span>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      Simpan tiket dan akses kembali pesananmu kapan saja.
                    </p>
                  </div>

                  {/* Tab Pilihan Daftar / Masuk */}
                  <div className="grid grid-cols-2 rounded-xl bg-card p-1 border border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("register");
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                      }}
                      className={`rounded-lg py-1.5 text-xs font-bold transition text-center ${
                        authTab === "register"
                          ? "bg-gate text-white shadow-xs"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Daftar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("login");
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                      }}
                      className={`rounded-lg py-1.5 text-xs font-bold transition text-center ${
                        authTab === "login"
                          ? "bg-gate text-white shadow-xs"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Masuk
                    </button>
                  </div>

                  {/* Form Tab Konten */}
                  <div className="space-y-3 pt-0.5">
                    {authTab === "register" ? (
                      /* Tab: DAFTAR */
                      <>
                        <div>
                          <label
                            htmlFor="auth-register-name"
                            className="block text-[11px] font-semibold text-ink"
                          >
                            Nama lengkap
                          </label>
                          <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="auth-register-name"
                              type="text"
                              value={buyerName}
                              onChange={(e) => onBuyerNameChange(e.target.value)}
                              placeholder="Gunakan nama pemesan"
                              disabled={isSubmitting || isAuthBusy}
                              className="h-9.5 w-full rounded-input border border-line bg-card pl-8.5 pr-3 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="auth-register-email"
                            className="block text-[11px] font-semibold text-ink"
                          >
                            Email
                          </label>
                          <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="auth-register-email"
                              type="email"
                              value={authEmail}
                              onChange={(e) => {
                                setAuthEmail(e.target.value);
                                setAuthError(null);
                              }}
                              placeholder="nama@email.com"
                              disabled={isSubmitting || isAuthBusy}
                              className="h-9.5 w-full rounded-input border border-line bg-card pl-8.5 pr-3 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="auth-register-password"
                            className="block text-[11px] font-semibold text-ink"
                          >
                            Password (minimal 6 karakter)
                          </label>
                          <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                              <KeyRound className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="auth-register-password"
                              type={showPassword ? "text" : "password"}
                              value={authPassword}
                              onChange={(e) => {
                                setAuthPassword(e.target.value);
                                setAuthError(null);
                              }}
                              placeholder="Buat kata sandi aman"
                              disabled={isSubmitting || isAuthBusy}
                              className="h-9.5 w-full rounded-input border border-line bg-card pl-8.5 pr-9 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => executeRegister()}
                          disabled={isAuthBusy || isSubmitting}
                          className="mt-1 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-button bg-gate px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-gate-strong transition disabled:opacity-50"
                        >
                          {isAuthBusy ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Membuat Akun...</span>
                            </>
                          ) : (
                            <span>Buat Akun</span>
                          )}
                        </button>
                      </>
                    ) : (
                      /* Tab: MASUK */
                      <>
                        <div>
                          <label
                            htmlFor="auth-login-email"
                            className="block text-[11px] font-semibold text-ink"
                          >
                            Email
                          </label>
                          <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="auth-login-email"
                              type="email"
                              value={authEmail}
                              onChange={(e) => {
                                setAuthEmail(e.target.value);
                                setAuthError(null);
                              }}
                              placeholder="nama@email.com"
                              disabled={isSubmitting || isAuthBusy}
                              className="h-9.5 w-full rounded-input border border-line bg-card pl-8.5 pr-3 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="auth-login-password"
                              className="block text-[11px] font-semibold text-ink"
                            >
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setForgotEmail(authEmail);
                                setIsForgotModalOpen(true);
                              }}
                              className="text-[11px] font-semibold text-gate hover:underline"
                            >
                              Lupa password?
                            </button>
                          </div>
                          <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                              <KeyRound className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="auth-login-password"
                              type={showPassword ? "text" : "password"}
                              value={authPassword}
                              onChange={(e) => {
                                setAuthPassword(e.target.value);
                                setAuthError(null);
                              }}
                              placeholder="Masukkan kata sandi"
                              disabled={isSubmitting || isAuthBusy}
                              className="h-9.5 w-full rounded-input border border-line bg-card pl-8.5 pr-9 text-xs text-ink placeholder:text-muted focus:border-gate focus:outline-none disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => executeLogin()}
                          disabled={isAuthBusy || isSubmitting}
                          className="mt-1 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-button bg-gate px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-gate-strong transition disabled:opacity-50"
                        >
                          {isAuthBusy ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Sedang Masuk...</span>
                            </>
                          ) : (
                            <span>Masuk</span>
                          )}
                        </button>
                      </>
                    )}

                    {/* Pesan Error / Sukses Khusus Auth */}
                    {authError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] font-medium text-rose-800 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}
                    {authSuccessMsg && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] font-medium text-emerald-800 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{authSuccessMsg}</span>
                      </div>
                    )}

                    {/* Separator "atau lanjutkan dengan" */}
                    <div className="relative my-2.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-line" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-page px-2 font-semibold text-muted">
                          atau lanjutkan dengan
                        </span>
                      </div>
                    </div>

                    {/* Tombol Social OAuth: Google & Facebook */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("google")}
                        disabled={isAuthBusy || isSubmitting}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-page disabled:opacity-50 transition"
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
                        onClick={() => handleSocialLogin("facebook")}
                        disabled={isAuthBusy || isSubmitting}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-page disabled:opacity-50 transition"
                      >
                        <svg className="h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alert Error General Checkout Jika Ada */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-input border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5 pt-3">
            <button
              type="submit"
              disabled={isSubmitting || isAuthBusy || selectedSeats.length === 0}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gate px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gate-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              {isSubmitting || isAuthBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isAuthBusy
                      ? "Menyiapkan akun..."
                      : "Memvalidasi & mengunci kursi..."}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Konfirmasi & tahan kursi</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting || isAuthBusy}
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-line bg-card px-4 py-2.5 text-xs font-semibold text-muted hover:bg-page hover:text-ink disabled:opacity-50"
            >
              Kembali pilih kursi
            </button>
          </div>
        </form>
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
