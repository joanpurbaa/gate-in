import React from "react";
import clsx from "clsx";

export interface PosterFallbackProps {
  name: string;
  slug: string;
  className?: string;
  /** Ukuran judul di kiri bawah: `sm` untuk thumbnail kecil, `md` kartu, `lg` detail/hero. */
  titleSize?: "sm" | "md" | "lg" | "none";
}

interface PosterPalette {
  bgClass: string;
  primaryVar: string;
  secondaryVar: string;
  highlightVar: string;
}

const PALETTES: PosterPalette[] = [
  {
    bgClass: "bg-ink",
    primaryVar: "var(--color-gate)",
    secondaryVar: "var(--color-gate-soft)",
    highlightVar: "var(--color-ticket)",
  },
  {
    bgClass: "bg-gate",
    primaryVar: "var(--color-ink)",
    secondaryVar: "var(--color-gate-tint)",
    highlightVar: "var(--color-ticket)",
  },
  {
    bgClass: "bg-gate-strong",
    primaryVar: "var(--color-gate-soft)",
    secondaryVar: "var(--color-ink)",
    highlightVar: "var(--color-ticket)",
  },
  {
    bgClass: "bg-ink-soft",
    primaryVar: "var(--color-gate)",
    secondaryVar: "var(--color-gate-tint)",
    highlightVar: "var(--color-ticket)",
  },
  {
    bgClass: "bg-ink",
    primaryVar: "var(--color-gate-soft)",
    secondaryVar: "var(--color-gate-strong)",
    highlightVar: "var(--color-ticket)",
  },
  {
    bgClass: "bg-gate",
    primaryVar: "var(--color-gate-strong)",
    secondaryVar: "var(--color-ink)",
    highlightVar: "var(--color-ticket)",
  },
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

const TITLE_SIZE_CLASS = {
  sm: "text-xs leading-tight line-clamp-2",
  md: "text-base sm:text-lg leading-tight line-clamp-2",
  lg: "text-xl sm:text-2xl leading-tight line-clamp-2",
  none: "sr-only",
} as const;

/**
 * PosterFallback generatif (DESIGN_V2.md bagian 5 & ASSETS.md bagian 4):
 * - Pasangan warna deterministik dari palet GateIn (Tinta, Gerbang, Karcis, turunan)
 * - Komposisi bentuk geometris dari lengkung (gerbang) dan lingkaran
 * - Nama acara dengan Bricolage Grotesque 800 di kiri bawah
 */
export function PosterFallback({
  name,
  slug,
  className,
  titleSize = "md",
}: PosterFallbackProps) {
  const seed = hashSeed(`${slug}:${name}`);
  const palette = PALETTES[seed % PALETTES.length];
  const patternIndex = Math.floor(seed / PALETTES.length) % 5;
  const offsetX = (seed % 7) * 6 - 18;
  const offsetY = ((seed >> 3) % 7) * 4 - 12;

  return (
    <div
      className={clsx(
        "relative aspect-[16/9] h-full w-full overflow-hidden select-none text-white",
        palette.bgClass,
        className
      )}
    >
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="h-full w-full"
      >
        {patternIndex === 0 && (
          <g transform={`translate(${offsetX} ${offsetY})`}>
            {/* Gerbang berlapis di sisi kanan + lingkaran sorotan */}
            <path
              d="M 150 190 V 78 A 68 68 0 0 1 286 78 V 190 Z"
              fill={palette.primaryVar}
            />
            <path
              d="M 176 190 V 88 A 42 42 0 0 1 260 88 V 190 Z"
              fill={palette.secondaryVar}
              opacity="0.85"
            />
            <circle cx="218" cy="68" r="18" fill={palette.highlightVar} />
            <circle
              cx="84"
              cy="44"
              r="52"
              fill="none"
              stroke={palette.secondaryVar}
              strokeWidth="10"
              opacity="0.45"
            />
          </g>
        )}

        {patternIndex === 1 && (
          <g transform={`translate(${offsetX} ${offsetY})`}>
            {/* Gelombang lingkaran konsentris + lengkung panggung */}
            <circle cx="236" cy="76" r="88" fill={palette.primaryVar} />
            <circle
              cx="236"
              cy="76"
              r="58"
              fill="none"
              stroke={palette.secondaryVar}
              strokeWidth="12"
            />
            <circle cx="236" cy="76" r="24" fill={palette.highlightVar} />
            <path
              d="M -20 185 A 120 120 0 0 1 180 185 Z"
              fill={palette.secondaryVar}
              opacity="0.35"
            />
          </g>
        )}

        {patternIndex === 2 && (
          <g transform={`translate(${offsetX} ${offsetY})`}>
            {/* Deretan lengkung akustik diagonal */}
            <path
              d="M 110 190 A 110 110 0 0 1 330 190 Z"
              fill={palette.primaryVar}
            />
            <path
              d="M 145 190 A 75 75 0 0 1 295 190 Z"
              fill={palette.secondaryVar}
            />
            <circle cx="252" cy="48" r="22" fill={palette.highlightVar} />
            <circle cx="188" cy="64" r="10" fill={palette.secondaryVar} />
            <path
              d="M 20 0 H 96 V 52 A 38 38 0 0 1 20 52 Z"
              fill={palette.primaryVar}
              opacity="0.6"
            />
          </g>
        )}

        {patternIndex === 3 && (
          <g transform={`translate(${offsetX} ${offsetY})`}>
            {/* Dua kubah gerbang bersinggungan + takik karcis */}
            <path
              d="M 120 190 V 82 A 54 54 0 0 1 228 82 V 190 Z"
              fill={palette.primaryVar}
            />
            <path
              d="M 198 190 V 60 A 62 62 0 0 1 322 60 V 190 Z"
              fill={palette.secondaryVar}
              opacity="0.88"
            />
            <circle cx="174" cy="62" r="16" fill={palette.highlightVar} />
            <circle cx="72" cy="58" r="34" fill={palette.primaryVar} opacity="0.55" />
          </g>
        )}

        {patternIndex === 4 && (
          <g transform={`translate(${offsetX} ${offsetY})`}>
            {/* Setengah lingkaran amphitheater dari atas + lencana karcis */}
            <circle cx="240" cy="24" r="128" fill={palette.primaryVar} />
            <circle cx="240" cy="24" r="86" fill={palette.secondaryVar} opacity="0.85" />
            <circle cx="240" cy="24" r="36" fill={palette.highlightVar} />
            <path
              d="M 36 190 V 116 A 42 42 0 0 1 120 116 V 190 Z"
              fill={palette.primaryVar}
              opacity="0.45"
            />
          </g>
        )}
      </svg>

      {/* Scrim pembaca di atas poster agar judul di kiri bawah selalu terbaca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent"
      />

      {titleSize !== "none" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <p
            className={clsx(
              "max-w-[85%] font-display font-extrabold tracking-[-0.02em] text-white",
              TITLE_SIZE_CLASS[titleSize]
            )}
          >
            {name}
          </p>
        </div>
      )}
    </div>
  );
}
