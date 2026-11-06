export type SaleState = "UPCOMING" | "OPEN" | "CLOSED" | "SOLD_OUT";

export function computeSaleState(params: {
  salesOpenAt: Date | string;
  salesCloseAt: Date | string;
  availableCount: number;
  now?: Date;
}): SaleState {
  const now = params.now ?? new Date();
  const openAt =
    typeof params.salesOpenAt === "string" ? new Date(params.salesOpenAt) : params.salesOpenAt;
  const closeAt =
    typeof params.salesCloseAt === "string" ? new Date(params.salesCloseAt) : params.salesCloseAt;

  if (now < openAt) return "UPCOMING";
  if (now > closeAt) return "CLOSED";
  if (params.availableCount <= 0) return "SOLD_OUT";
  return "OPEN";
}

const PILL_STYLES: Record<SaleState, { label: string; className: string; dotClass: string }> = {
  OPEN: {
    label: "Penjualan dibuka",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    dotClass: "bg-emerald-600",
  },
  UPCOMING: {
    label: "Belum dibuka",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    dotClass: "bg-amber-500",
  },
  CLOSED: {
    label: "Ditutup",
    className: "border-line bg-page text-muted",
    dotClass: "bg-muted",
  },
  SOLD_OUT: {
    label: "Habis terjual",
    className: "border-rose-200 bg-rose-50 text-rose-900",
    dotClass: "bg-rose-600",
  },
};

export function StatusPill({ state }: { state: SaleState }) {
  const cfg = PILL_STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
      <span>{cfg.label}</span>
    </span>
  );
}
