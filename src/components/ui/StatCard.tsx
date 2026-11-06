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

  return (
    <div className="rounded-card border border-line bg-card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-extrabold tracking-tight ${accentStyles}`}>
        {value}
      </div>
      {sublabel && <div className="mt-0.5 text-xs text-muted">{sublabel}</div>}
    </div>
  );
}
