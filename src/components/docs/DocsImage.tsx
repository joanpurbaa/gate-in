"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Maximize2, X } from "lucide-react";

interface DocsImageProps {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
  width?: number;
  height?: number;
  variant?: "mobile" | "desktop" | "auto";
}

export function DocsImage({
  src,
  alt,
  caption,
  priority = false,
  width = 1200,
  height = 800,
  variant = "auto",
}: DocsImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Otomatis deteksi apakah ini tangkapan layar mobile HP atau desktop
  const isMobile =
    variant === "mobile" ||
    (variant === "auto" && (src.includes("pengunjung") || src.includes("390")));

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <figure className="my-6 flex flex-col items-center">
      {/* Container Gambar yang Disesuaikan Ukurannya */}
      <div
        className={`w-full ${
          isMobile ? "max-w-[280px] sm:max-w-[310px]" : "max-w-[560px] sm:max-w-[620px]"
        }`}
      >
        <div
          onClick={() => setIsOpen(true)}
          className={`group relative cursor-zoom-in overflow-hidden border border-line bg-card shadow-xs transition hover:border-gate/60 hover:shadow-md ${
            isMobile ? "rounded-[28px] p-1.5 bg-ink/5" : "rounded-2xl"
          }`}
          role="button"
          tabIndex={0}
          aria-label={`Perbesar gambar: ${caption}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {/* Header Bingkai Mockup Desktop */}
          {!isMobile && (
            <div className="flex items-center gap-1.5 border-b border-line bg-page/80 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-2 font-mono text-[10px] text-muted truncate">
                app.gatein.id
              </span>
            </div>
          )}

          <div className={`overflow-hidden ${isMobile ? "rounded-[22px]" : ""}`}>
            <Image
              src={src}
              alt={alt}
              width={isMobile ? 390 : width}
              height={isMobile ? 844 : height}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="h-auto w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            />
          </div>

          {/* Badge Petunjuk Zoom */}
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3 w-3" />
            <span>Klik perbesar</span>
          </div>
        </div>

        <figcaption className="mt-2 text-center text-xs font-medium text-muted">
          {caption}
        </figcaption>
      </div>

      {/* Modal Zoom Lightbox Resolusi Penuh */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={caption}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-5xl overflow-hidden rounded-2xl border border-line/40 bg-card p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs font-medium text-ink">
              <span className="truncate pr-4 font-bold">{caption}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-page hover:text-ink transition"
                aria-label="Tutup pratinjau gambar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[82vh] overflow-auto p-2">
              <Image
                src={src}
                alt={alt}
                width={width * 1.5}
                height={height * 1.5}
                className="h-auto w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
