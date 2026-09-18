"use client";

type Ponto = { label: string; meta: number | null; atingido: number };

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

// Cores via CSS variable (respeitam o tema claro/escuro ativo)
const cssVar = (name: string) => `rgb(var(${name}))`;
const GREEN = cssVar("--c-success");
const RED = cssVar("--c-danger");
const META_COLOR = cssVar("--c-meta-ref");
const NEUTRO = cssVar("--c-accent"); // usado só quando não há meta definida ainda

export default function BarChart({ data }: { data: Ponto[] }) {
  const globalMax = Math.max(...data.map((d) => Math.max(d.meta ?? 0, d.atingido)), 1);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: META_COLOR }} /> Meta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: GREEN }} /> Atingido (bateu a meta)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: RED }} /> Atingido (abaixo da meta)
        </span>
      </div>
      <div className="flex items-end gap-4 h-60">
        {data.map((d) => {
          const pctRaw = d.meta ? (d.atingido / d.meta) * 100 : null;
          const pct = pctRaw != null ? Math.round(pctRaw) : null;
          const superavit = pct != null && pct >= 100;
          const corAtingido = pct == null ? NEUTRO : superavit ? GREEN : RED;

          const metaPct = d.meta ? (d.meta / globalMax) * 100 : 0;
          const atingidoPct = (d.atingido / globalMax) * 100;

          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              {pct != null ? (
                <span className="text-xs font-medium" style={{ color: corAtingido }}>
                  {pct}%
                </span>
              ) : (
                <span className="text-xs text-ink/30">—</span>
              )}
              <div className="w-full flex items-end justify-center gap-1.5 flex-1">
                {d.meta != null && (
                  <div
                    className="w-2/5 max-w-[22px] h-full flex items-end"
                    title={`Meta: ${currency(d.meta)}`}
                  >
                    <div
                      className="w-full rounded-t-sm"
                      style={{ height: `${metaPct}%`, backgroundColor: META_COLOR }}
                    />
                  </div>
                )}
                <div
                  className="w-2/5 max-w-[22px] h-full flex items-end"
                  title={`Atingido: ${currency(d.atingido)}`}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${atingidoPct}%`, backgroundColor: corAtingido }}
                  />
                </div>
              </div>
              <div className="text-xs text-ink/50">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
