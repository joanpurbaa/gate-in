"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownBarProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

export function CountdownBar({ expiresAt, onExpire }: CountdownBarProps) {
  const targetMs = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    Math.max(0, Math.floor((targetMs - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = () => {
      const sec = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
      setRemainingSec(sec);
      if (sec <= 0) {
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetMs, onExpire]);

  const mins = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const secs = String(remainingSec % 60).padStart(2, "0");
  const isUrgent = remainingSec <= 120;
  const isExpired = remainingSec <= 0;

  return (
    <div
      role="timer"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 rounded-input border px-4 py-3 text-xs font-medium ${
        isExpired
          ? "border-rose-300 bg-rose-50 text-rose-900"
          : "border-line bg-card text-ink"
      }`}
    >
      <div className="flex items-center gap-2">
        {isExpired ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-gate" />
        )}
        <span>
          {isExpired
            ? "Waktu tahan kursi telah berakhir. Kursi dilepas kembali untuk pengunjung lain."
            : "Kursimu ditahan sementara. Selesaikan pembayaran sebelum:"}
        </span>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 font-display text-sm font-extrabold ${
          isExpired
            ? "bg-rose-200 text-rose-950"
            : isUrgent
              ? "bg-ticket text-ink"
              : "bg-ink text-white"
        }`}
      >
        {mins}:{secs}
      </span>
    </div>
  );
}
