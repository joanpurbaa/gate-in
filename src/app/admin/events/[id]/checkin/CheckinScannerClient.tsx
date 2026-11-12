"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Keyboard,
  Loader2,
  XCircle,
} from "lucide-react";
import { SeatMap } from "@/components/seatmap/SeatMap";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import type { CheckinOutcome } from "@/lib/checkin";
import type { LayoutV1 } from "@/lib/layout/types";
import { formatTimeRange } from "@/lib/time";

interface CheckinScannerClientProps {
  event: {
    id: string;
    slug: string;
    name: string;
    venueName: string;
    gateOpenAt: string;
    gateCloseAt: string;
  };
  layout: LayoutV1 | null;
  zones: SeatZoneInfo[];
  initialSeats: SeatMapItem[];
  initialSold: number;
  initialCheckedIn: number;
}

export function CheckinScannerClient({
  event,
  layout,
  zones,
  initialSeats,
  initialSold,
  initialCheckedIn,
}: CheckinScannerClientProps) {
  const [manualCode, setManualCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<CheckinOutcome | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
    isScanning?: boolean;
  } | null>(null);
  const busyScanRef = useRef(false);

  const [seats, setSeats] = useState<SeatMapItem[]>(initialSeats);
  const [soldCount, setSoldCount] = useState(initialSold);
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedIn);

  const pollLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/live`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.seats)) setSeats(data.seats);
      if (data.stats) {
        setSoldCount(data.stats.soldSeats);
        setCheckedInCount(data.stats.checkedInSeats);
      }
    } catch {
      // Abaikan gangguan jaringan sesaat
    }
  }, [event.id]);

  useEffect(() => {
    const id = window.setInterval(pollLive, 3000);
    return () => window.clearInterval(id);
  }, [pollLive]);

  const verifyCode = useCallback(
    async (rawCode: string) => {
      const cleaned = rawCode.trim().toUpperCase();
      if (!cleaned || busyScanRef.current) return;
      busyScanRef.current = true;
      setSubmitting(true);

      try {
        const res = await fetch("/api/admin/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            code: cleaned,
          }),
        });
        const data: CheckinOutcome = await res.json();
        setScanResult(data);

        // Bila VALID, langsung ubah kursi di denah menjadi hijau (CHECKED_IN)
        if (data.result === "VALID") {
          setSeats((prev) =>
            prev.map((s) =>
              s.label === data.ticket.seatLabel ? { ...s, status: "CHECKED_IN" } : s
            )
          );
          setCheckedInCount((c) => c + 1);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(150);
          }
        } else if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([80, 60, 80]);
        }

        await pollLive();

        // Otomatis kembali ke mode scan setelah 3,2 detik
        window.setTimeout(() => {
          setScanResult(null);
          busyScanRef.current = false;
        }, 3200);
      } catch {
        busyScanRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [event.id, pollLive]
  );

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Abaikan error saat stop
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const startCamera = async () => {
    if (cameraStarting || cameraActive) return;
    setCameraStarting(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Pastikan instance scanner sebelumnya dibersihkan jika masih menggantung
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // Abaikan
        }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("gatein-qr-reader");
      scannerRef.current = scanner;

      // Deteksi kamera yang tersedia (laptop front camera vs smartphone back camera)
      let selectedCamera: string | { facingMode: string } = { facingMode: "environment" };

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Cari kamera belakang jika ada (untuk smartphone panitia check-in)
          const backCam = devices.find((d) =>
            /back|rear|environment|belakang/i.test(d.label)
          );
          // Gunakan kamera belakang jika ada; jika laptop (FaceTime/webcam), gunakan device pertama
          selectedCamera = backCam ? backCam.id : devices[0].id;
        }
      } catch {
        // Fallback jika enumerasi kamera diblokir sebelum izin
        selectedCamera = { facingMode: "environment" };
      }

      // qrbox dinamis agar proporsional dan tidak pernah melebihi ukuran viewfinder
      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(Math.floor(minEdge * 0.7), 160);
          return {
            width: Math.min(size, 260),
            height: Math.min(size, 260),
          };
        },
      };

      const onScanSuccess = (decodedText: string) => {
        // Ekstrak kode tiket bila yang di-scan adalah URL penuh `/tiket/KODETIKET`
        const parts = decodedText.trim().split("/");
        const extracted = parts[parts.length - 1] || decodedText;
        verifyCode(extracted);
      };

      const onScanError = () => {
        // Frame tanpa QR diabaikan
      };

      try {
        await scanner.start(selectedCamera, qrConfig, onScanSuccess, onScanError);
      } catch (firstErr) {
        // Jika gagal dengan environment constraint (pada laptop/browser tertentu), coba fallback ke user
        if (typeof selectedCamera === "object" && selectedCamera.facingMode === "environment") {
          await scanner.start({ facingMode: "user" }, qrConfig, onScanSuccess, onScanError);
        } else {
          throw firstErr;
        }
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Gagal memulai scanner kamera:", err);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // Abaikan
        }
        scannerRef.current = null;
      }
      setCameraActive(false);
      setCameraError(
        "Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera aktif di browser Anda atau gunakan kolom input kode manual di samping."
      );
    } finally {
      setCameraStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => null);
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // Abaikan
        }
      }
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 pb-16">
      {/* Overlay Hasil Scan Layar Penuh selama ~3 detik */}
      {scanResult && (
        <div
          role="alertdialog"
          aria-live="assertive"
          onClick={() => {
            setScanResult(null);
            busyScanRef.current = false;
          }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center text-white transition ${
            scanResult.result === "VALID"
              ? "bg-green-700"
              : scanResult.result === "ALREADY_USED"
                ? "bg-amber-600"
                : "bg-rose-700"
          }`}
        >
          {scanResult.result === "VALID" && (
            <>
              <CheckCircle2 className="h-20 w-20 text-white" />
              <span className="mt-3 rounded-full bg-white/20 px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                HASIL SCAN: VALID
              </span>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Kursi {scanResult.ticket.seatLabel}
              </h2>
              <p className="mt-1 text-lg font-semibold text-green-100">
                Zona {scanResult.ticket.zoneName} • {scanResult.ticket.buyerName}
              </p>
              <p className="mt-1 font-mono text-sm text-green-200">
                Kode: {scanResult.ticket.code}
              </p>
              {scanResult.outsideGateWarning && (
                <div className="mt-4 max-w-md rounded-xl bg-black/25 px-4 py-2.5 text-xs font-medium text-amber-200">
                  ⚠️ {scanResult.outsideGateWarning}
                </div>
              )}
            </>
          )}

          {scanResult.result === "ALREADY_USED" && (
            <>
              <AlertTriangle className="h-20 w-20 text-white" />
              <span className="mt-3 rounded-full bg-white/20 px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                SUDAH DIGUNAKAN
              </span>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Tiket Kursi {scanResult.ticket.seatLabel} Sudah Check-in
              </h2>
              <p className="mt-2 text-base font-semibold text-amber-100">
                Atas Nama: {scanResult.ticket.buyerName} ({scanResult.ticket.zoneName})
              </p>
              <p className="mt-2 rounded-xl bg-black/25 px-4 py-2 text-xs font-semibold">
                Check-in pertama tercatat pada: {scanResult.firstCheckedInFormatted}
              </p>
            </>
          )}

          {scanResult.result === "INVALID" && (
            <>
              <XCircle className="h-20 w-20 text-white" />
              <span className="mt-3 rounded-full bg-white/20 px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest">
                TIDAK VALID
              </span>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Tiket Tidak Terdaftar
              </h2>
              <p className="mt-2 max-w-md text-sm text-rose-100">{scanResult.message}</p>
              {scanResult.code && (
                <p className="mt-2 font-mono text-xs text-rose-200">Kode: {scanResult.code}</p>
              )}
            </>
          )}

          <p className="mt-8 text-xs text-white/80">
            Ketuk layar untuk menutup lebih cepat (otomatis kembali dalam 3 detik)
          </p>
        </div>
      )}

      {/* Header Check-in */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div>
          <Link
            href={`/admin/events/${event.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Detail Acara</span>
          </Link>
          <h1 className="mt-1 text-lg font-bold text-ink sm:text-xl">
            Check-in QR Peserta: {event.name}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Clock className="h-3.5 w-3.5 text-gate" />
            <span>Open Gate: {formatTimeRange(event.gateOpenAt, event.gateCloseAt)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-right">
          <span className="block text-[11px] font-semibold text-green-800">Kehadiran Saat Ini</span>
          <span className="font-mono text-lg font-bold text-green-800">
            {checkedInCount} / {soldCount} Hadir
          </span>
        </div>
      </div>

      {/* Scanner Kamera + Input Manual */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Kamera QR */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Camera className="h-4 w-4 text-gate" />
              <span>Scanner Kamera QR</span>
            </div>
            {cameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800"
              >
                <CameraOff className="h-3.5 w-3.5" />
                <span>Matikan Kamera</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={cameraStarting}
                onClick={startCamera}
                className="inline-flex items-center gap-1 rounded-lg bg-gate px-3 py-1.5 text-xs font-semibold text-white hover:bg-gate-strong disabled:opacity-60"
              >
                {cameraStarting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    <span>Aktifkan Kamera</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="relative mt-3 min-h-[260px] overflow-hidden rounded-xl border border-dashed border-line bg-ink">
            {/* Wadah khusus Html5Qrcode murni tanpa anak JSX agar React tidak menghapus elemen video saat re-render */}
            <div
              id="gatein-qr-reader"
              className="w-full overflow-hidden rounded-xl [&_video]:w-full [&_video]:h-auto [&_video]:max-h-[420px] [&_video]:object-cover [&_video]:rounded-xl"
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink p-4 text-center text-xs text-muted">
                {cameraStarting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-gate" />
                    <span className="font-semibold text-white">Menghubungkan ke kamera...</span>
                    <span className="text-[11px] text-muted">
                      Mohon berikan izin akses kamera jika diminta oleh browser.
                    </span>
                  </div>
                ) : (
                  <span>
                    Tekan &ldquo;Aktifkan Kamera&rdquo; untuk memindai QR e-ticket dari layar ponsel
                    pengunjung.
                  </span>
                )}
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              {cameraError}
            </div>
          )}
        </div>

        {/* Input Manual & Tombol Uji Cepat Demo */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Keyboard className="h-4 w-4 text-gate" />
              <span>Input Kode Tiket Manual (Cadangan)</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Ketik 10 karakter kode tiket jika kamera tidak digunakan atau layar pengunjung redup.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyCode(manualCode);
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Contoh: DEMO000VLD"
                className="min-h-12 flex-1 rounded-xl border border-line px-3.5 font-mono text-sm font-bold uppercase tracking-wider text-ink focus:border-gate focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !manualCode.trim()}
                className="min-h-12 rounded-xl bg-gate px-5 text-xs font-semibold text-white hover:bg-gate-strong disabled:bg-line"
              >
                {submitting ? "Memeriksa..." : "Check-in"}
              </button>
            </form>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-page p-3.5">
            <div className="text-xs font-bold text-ink">
              Uji Cepat 3 Hasil Check-in (Skenario Demo Juri)
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              Ketuk salah satu kode di bawah untuk langsung mendemonstrasikan ketiga kondisi:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualCode("DEMO000VLD");
                  verifyCode("DEMO000VLD");
                }}
                className="rounded-lg border border-green-300 bg-green-50 px-2.5 py-1.5 font-mono text-xs font-bold text-green-900 hover:bg-green-100"
              >
                1. DEMO000VLD (Valid → Kursi C-8 Hijau)
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCode("DEMO000USD");
                  verifyCode("DEMO000USD");
                }}
                className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-900 hover:bg-amber-100"
              >
                2. DEMO000USD (Sudah Digunakan)
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCode("ZZZZ999999");
                  verifyCode("ZZZZ999999");
                }}
                className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 font-mono text-xs font-bold text-rose-900 hover:bg-rose-100"
              >
                3. ZZZZ999999 (Tidak Valid)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Denah Kehadiran Live */}
      {layout && (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-xs">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-ink">
              Denah Kehadiran Real-time (Hijau = Hadir)
            </h2>
            <p className="text-xs text-muted">
              Saat tiket valid di-scan, kursi langsung berubah menjadi warna hijau dengan ikon
              centang.
            </p>
          </div>
          <SeatMap layout={layout} seats={seats} zones={zones} mode="view" />
        </section>
      )}
    </main>
  );
}
