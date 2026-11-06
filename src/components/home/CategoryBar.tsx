"use client";

import React from "react";
import clsx from "clsx";
import { CATEGORIES, CategoryIcon, type EventCategoryKey } from "@/components/icons/categories";

export interface CategoryBarProps {
  selectedCategory: string | null;
  onSelectCategory: (categorySlug: string | null) => void;
  availableCategories: Set<string>;
}

export function CategoryBar({
  selectedCategory,
  onSelectCategory,
  availableCategories,
}: CategoryBarProps) {
  // Hanya tampilkan kategori yang memiliki setidaknya satu acara terbit
  const visibleCategories = CATEGORIES.filter((c) =>
    availableCategories.has(c.key)
  );

  return (
    <nav
      aria-label="Filter kategori acara"
      className="no-scrollbar flex w-full items-center gap-3 overflow-x-auto px-4 py-4 sm:justify-center sm:gap-6 sm:px-6"
    >
      {/* Tombol Semua */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gate"
      >
        <div
          className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-full border transition duration-200 sm:h-16 sm:w-16",
            selectedCategory === null
              ? "border-gate bg-gate text-white shadow-sm"
              : "border-line bg-gate/8 text-ink group-hover:border-gate/40 group-hover:bg-gate/12"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 sm:h-6 sm:w-6"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <span
          className={clsx(
            "text-xs font-semibold transition whitespace-nowrap",
            selectedCategory === null ? "text-gate font-bold" : "text-muted group-hover:text-ink"
          )}
        >
          Semua
        </span>
      </button>

      {/* Kategori Berisi Acara */}
      {visibleCategories.map((cat) => {
        const isSelected = selectedCategory === cat.slug || selectedCategory === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelectCategory(isSelected ? null : cat.slug)}
            className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gate"
          >
            <div
              className={clsx(
                "flex h-14 w-14 items-center justify-center rounded-full border transition duration-200 sm:h-16 sm:w-16",
                isSelected
                  ? "border-gate bg-gate text-white shadow-sm"
                  : "border-line bg-gate/8 text-ink group-hover:border-gate/40 group-hover:bg-gate/12"
              )}
            >
              <CategoryIcon
                category={cat.key as EventCategoryKey}
                className="h-5 w-5 sm:h-6 sm:w-6"
              />
            </div>
            <span
              className={clsx(
                "text-xs font-semibold transition whitespace-nowrap",
                isSelected ? "text-gate font-bold" : "text-muted group-hover:text-ink"
              )}
            >
              {cat.shortName}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
