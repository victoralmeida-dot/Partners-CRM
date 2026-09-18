type MetaParceiroMes = {
  id: string;
  partnerId: string;
  partnerNome: string;
  valorMeta: number;
  realizado: number;
  pct: number;
};

export default function MetasParceiroMesTable({ metas }: { metas: MetaParceiroMes[] }) {
  if (metas.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        Nenhuma meta de indicação definida para este mês ainda.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-ink/40 text-xs uppercase">
          <th className="py-2 font-normal">Parceiro</th>
          <th className="font-normal">Meta</th>
          <th className="font-normal">Realizado</th>
          <th className="font-normal">%</th>
          <th className="font-normal w-1/3">Progresso</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {metas.map((m) => {
          const bateu = m.pct >= 100;
          const corTexto = bateu ? "text-[rgb(var(--c-success))]" : "text-amber";
          const corBarra = bateu ? "bg-[rgb(var(--c-success))]" : "bg-amber";
          return (
            <tr key={m.id}>
              <td className="py-2 text-ink">{m.partnerNome}</td>
              <td className="text-ink/70">{m.valorMeta}</td>
              <td className="text-ink/70">{m.realizado}</td>
              <td className={`font-medium ${corTexto}`}>{m.pct.toFixed(0)}%</td>
              <td>
                <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full ${corBarra}`}
                    style={{ width: `${Math.min(100, m.pct)}%` }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
