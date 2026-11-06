import React from "react";
import clsx from "clsx";

export type BadgeTone = "ticket" | "gate" | "ink" | "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  // Sorotan Karcis (lime) selalu memakai teks Tinta
  ticket: "border-ticket bg-ticket text-ink font-semibold",
  gate: "border-gate/20 bg-gate/10 text-gate font-semibold",
  ink: "border-ink bg-ink text-white font-semibold",
  neutral: "border-line bg-page text-muted font-medium",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold",
  warning: "border-amber-200 bg-amber-50 text-amber-900 font-semibold",
  danger: "border-rose-200 bg-rose-50 text-rose-800 font-semibold",
};

/**
 * Lencana berbentuk pil penuh (rounded-full) untuk status, kategori, atau sinyal kelangkaan.
 */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-tight",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
