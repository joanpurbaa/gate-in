import Image from "next/image";
import clsx from "clsx";

type LogoVariant = "color" | "reversed";
type LogoSize = "sm" | "md" | "lg";

/** Tinggi mark dalam px per ukuran. Teks wordmark mengikuti proporsinya. */
const MARK_HEIGHT: Record<LogoSize, number> = { sm: 24, md: 32, lg: 44 };
const WORDMARK_CLASS: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

const MARK_SRC: Record<LogoVariant, string> = {
  color: "/brand/gatein-mark.svg",
  reversed: "/brand/gatein-mark-reversed.svg",
};

interface LogoProps {
  /** `color` untuk latar terang, `reversed` untuk latar Tinta/gelap. */
  variant?: LogoVariant;
  size?: LogoSize;
  /** Sembunyikan teks "GateIn" (misalnya ruang sangat sempit). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Logo GateIn: mark dari public/brand/ (tidak digambar ulang) + wordmark sebagai
 * teks sungguhan dengan Bricolage Grotesque 800. Jarak mark–teks ≈ lebar figur.
 */
export function Logo({ variant = "color", size = "md", markOnly = false, className }: LogoProps) {
  const h = MARK_HEIGHT[size];
  return (
    <span
      className={clsx(
        "inline-flex items-center leading-none",
        variant === "reversed" ? "text-white" : "text-ink",
        className
      )}
      style={{ gap: Math.round(h * 0.22) }}
    >
      <Image
        src={MARK_SRC[variant]}
        alt={markOnly ? "GateIn" : ""}
        width={h}
        height={h}
        unoptimized
        loading="eager"
        style={{ height: h, width: "auto" }}
      />
      {!markOnly && (
        <span
          className={clsx(
            "font-display font-extrabold tracking-[-0.03em]",
            WORDMARK_CLASS[size]
          )}
        >
          GateIn
        </span>
      )}
    </span>
  );
}
