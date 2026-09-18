"use client";

type Item = { label: string; value: number; sublabel?: string };

export default function RankingChart({
  items,
  color = "rgb(var(--c-accent))",
  emptyLabel = "Sem dados ainda.",
}: {
  items: Item[];
  color?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink/40">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ink font-medium">{item.label}</span>
            <span className="text-ink/50 text-xs">
              {item.value}
              {item.sublabel ? ` · ${item.sublabel}` : ""}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-line overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
