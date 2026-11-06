import React from "react";
import { Info, AlertTriangle } from "lucide-react";

interface DocsNoteProps {
  type?: "tip" | "important";
  title?: string;
  children: React.ReactNode;
}

export function DocsNote({ type = "tip", title, children }: DocsNoteProps) {
  const isTip = type === "tip";

  return (
    <div
      role="region"
      aria-label={title || (isTip ? "Tips Praktis" : "Catatan Penting")}
      className={`my-4 rounded-xl border p-4 text-xs transition shadow-2xs ${
        isTip
          ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
          : "border-amber-300 bg-amber-50/80 text-amber-950"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isTip ? (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        )}
        <div className="flex-1 space-y-1">
          <div className="font-display font-bold uppercase tracking-wider text-[11px]">
            {title || (isTip ? "Tips Praktis" : "Penting untuk Diingat")}
          </div>
          <div className="text-xs leading-relaxed opacity-95">{children}</div>
        </div>
      </div>
    </div>
  );
}
