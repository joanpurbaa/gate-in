import React from "react";
import clsx from "clsx";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  asSpan?: boolean;
  children: React.ReactNode;
}

/**
 * Chip berbentuk pil penuh (rounded-full) untuk kota, filter kategori, atau kursi terpilih.
 */
export function Chip({
  active = false,
  asSpan = false,
  className,
  children,
  ...rest
}: ChipProps) {
  const classes = clsx(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
    active
      ? "border-ink bg-ink text-white"
      : "border-line bg-card text-ink hover:border-muted/50",
    className
  );

  if (asSpan) {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
