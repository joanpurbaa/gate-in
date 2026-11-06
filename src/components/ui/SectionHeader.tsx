import React from "react";
import Link from "next/link";
import clsx from "clsx";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Header section sesuai DESIGN_V2.md bagian 2 & 4:
 * - Judul Bricolage Grotesque tanpa label huruf kapital di atasnya
 * - Tautan "Lihat semua" di kanan bila `href` diberikan
 */
export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "Lihat semua",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={clsx("mb-4 flex items-baseline justify-between gap-4", className)}>
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted sm:text-sm">{subtitle}</p>}
      </div>

      {action ? (
        action
      ) : href ? (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-gate transition hover:text-gate-strong sm:text-sm"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
