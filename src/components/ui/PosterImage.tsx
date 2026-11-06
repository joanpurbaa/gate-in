"use client";

import React, { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { BRAND_COLORS } from "@/lib/design-tokens";
import { PosterFallback } from "./PosterFallback";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="${BRAND_COLORS.ink}"/></svg>`;
const BLUR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

export interface PosterImageProps {
  src: string | null | undefined;
  alt: string;
  slug: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  fallbackTitleSize?: "sm" | "md" | "lg" | "none";
}

/**
 * PosterImage rasio 16:9 dengan placeholder blur dan fallback otomatis ke
 * PosterFallback bila src kosong atau gagal dimuat.
 */
export function PosterImage({
  src,
  alt,
  slug,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px",
  className,
  imgClassName,
  fallbackTitleSize = "md",
}: PosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmed = src?.trim() ?? "";
  const showFallback = !trimmed || failedSrc === trimmed;

  return (
    <div
      className={clsx(
        "relative aspect-[16/9] w-full overflow-hidden bg-ink",
        className
      )}
    >
      {showFallback ? (
        <PosterFallback name={alt} slug={slug} titleSize={fallbackTitleSize} />
      ) : (
        <Image
          src={trimmed}
          alt={alt}
          fill
          sizes={sizes}
          preload={priority}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          onError={() => setFailedSrc(trimmed)}
          className={clsx("object-cover", imgClassName)}
        />
      )}
    </div>
  );
}
