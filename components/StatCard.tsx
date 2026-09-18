export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "amber" | "accent" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber"
      : tone === "accent"
      ? "text-accent"
      : tone === "rose"
      ? "text-rose"
      : "text-ink";

  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-ink/40 mt-1">{hint}</p>}
    </div>
  );
}
