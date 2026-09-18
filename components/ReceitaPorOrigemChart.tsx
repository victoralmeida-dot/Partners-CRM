"use client";

const CORES_ORIGEM: Record<string, string> = {
  INDICACAO: "#3B82F6", // azul
  CONTRATO: "#8B8F98", // cinza neutro
  COMISSAO: "#D7A32E", // âmbar
  NOVO_CONTRATO: "#34D399", // verde
  EVENTO: "#A78BFA", // violeta
  INFLUENCIA: "#F472B6", // rosa
  LOCACAO_ESPACO: "#22D3EE", // ciano
  OUTRO: "#6B7280", // cinza escuro
};

const LABEL_ORIGEM: Record<string, string> = {
  INDICACAO: "Indicação convertida",
  CONTRATO: "Parcela de contrato",
  COMISSAO: "Comissionamento",
  NOVO_CONTRATO: "Novo contrato",
  EVENTO: "Patrocínio",
  INFLUENCIA: "Influência",
  LOCACAO_ESPACO: "Locação de espaço",
  OUTRO: "Outro",
};

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function ReceitaPorOrigemChart({
  dados,
}: {
  dados: { origem: string; valor: number }[];
}) {
  const total = dados.reduce((sum, d) => sum + d.valor, 0);
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const ordenado = [...dados].sort((a, b) => b.valor - a.valor);

  if (dados.length === 0 || total === 0) {
    return <p className="text-sm text-ink/40">Nenhum lançamento no período/filtro selecionado.</p>;
  }

  return (
    <div className="space-y-3">
      {ordenado.map((d) => {
        const cor = CORES_ORIGEM[d.origem] ?? "#6B7280";
        const pct = total > 0 ? (d.valor / total) * 100 : 0;
        return (
          <div key={d.origem}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-ink font-medium">{LABEL_ORIGEM[d.origem] ?? d.origem}</span>
              <span className="text-ink/50 text-xs">
                {currency(d.valor)} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: cor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
