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
  const toneStyles = {
    default: "border-stone-200 bg-white text-stone-900",
    indigo: "border-indigo-200 bg-indigo-50/70 text-[#3730A3]",
    green: "border-green-200 bg-green-50/80 text-green-800",
    amber: "border-amber-200 bg-amber-50/80 text-amber-900",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${toneStyles}`}>
      <div className="text-xs font-semibold text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-stone-500">{sublabel}</div>}
    </div>
  );
}
