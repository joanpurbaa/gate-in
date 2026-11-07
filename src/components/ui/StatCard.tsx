export function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "default" | "indigo" | "green" | "amber";
}) {
  const accentStyles = {
    default: "text-ink",
    indigo: "text-gate",
    green: "text-seat-checked",
    amber: "text-amber-700",
  }[tone];

  const stringVal = String(value);
  const isLong = stringVal.length >= 10;

  return (
    <div className="flex flex-col justify-between rounded-card border border-line bg-card p-3.5 sm:p-4 shadow-2xs">
      <div>
        <div className="text-xs font-medium text-muted truncate" title={label}>
          {label}
        </div>
        <div
          className={`mt-1 font-display font-extrabold tracking-tight tabular-nums ${
            isLong ? "text-lg sm:text-xl lg:text-2xl" : "text-xl sm:text-2xl"
          } ${accentStyles}`}
          title={stringVal}
        >
          {value}
        </div>
      </div>
      {sublabel && (
        <div className="mt-1 text-[11px] sm:text-xs text-muted leading-tight">
          {sublabel}
        </div>
      )}
    </div>
  );
}
