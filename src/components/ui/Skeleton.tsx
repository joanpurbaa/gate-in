import React from "react";
import clsx from "clsx";

export interface SkeletonProps {
  className?: string;
  rounded?: "card" | "button" | "input" | "full";
}

const ROUNDED_MAP = {
  card: "rounded-card",
  button: "rounded-button",
  input: "rounded-input",
  full: "rounded-full",
} as const;

/**
 * Komponen Skeleton untuk state loading halaman dan kartu.
 */
export function Skeleton({ className, rounded = "input" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx("animate-pulse bg-line/70", ROUNDED_MAP[rounded], className)}
    />
  );
}
