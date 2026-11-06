import React from "react";
import Link from "next/link";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "text";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButtonProps = BaseButtonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    href?: undefined;
  };

type ButtonAsLinkProps = BaseButtonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gate text-white hover:bg-gate-strong disabled:bg-line disabled:text-muted",
  secondary:
    "border border-line bg-card text-ink hover:border-muted/50 hover:bg-page disabled:opacity-50",
  text: "bg-transparent text-gate hover:bg-gate/8 disabled:text-muted",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 py-2 text-xs",
  md: "min-h-12 px-5 py-2.5 text-sm sm:min-h-11",
  lg: "min-h-12 px-6 py-3 text-base",
};

/**
 * Tombol standar GateIn (DESIGN_V2.md bagian 2):
 * - Radius 14px (rounded-button)
 * - Utama: latar Gerbang, teks putih, tinggi minimal 48px (min-h-12) di HP
 * - Tanpa tanda panah dekoratif
 */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const classes = clsx(
    "inline-flex items-center justify-center gap-2 rounded-button font-semibold transition select-none disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className
  );

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={buttonRest.type ?? "button"} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
