"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import BarChart from "@/components/BarChart";
import Badge from "@/components/Badge";
import CurrencyInput from "@/components/CurrencyInput";
import ReceitaPorOrigemChart from "@/components/ReceitaPorOrigemChart";

type MesDado = { periodo: string; label: string; meta: number | null; atingido: number };
type DashboardMetas = { ano: number; meses: MesDado[]; trimestres: MesDado[] };
type Meta = { id: string; periodo: string; tipo: string; valorMeta: number };
type Partner = { id: string; nome: string };
type Receita = {
  id: string;
  partnerId: string | null;
  origem: string;
  valor: number;
  data: string;
  descricao: string | null;
  numeroNota: string | null;
  partner: { nome: string } | null;
};

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const dateFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(d));

// Parser simples de CSV: vírgula como separador, aspas duplas pra campos com vírgula dentro.
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

const PAGE_SIZE_LANCAMENTOS = 25;

export default function MetasPage() {
  const hoje = new Date();
  const anoAtualStr = String(hoje.getFullYear());
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");

  const [ano, setAno] = useState(new Date().getFullYear());
  const [dados, setDados] = useState<DashboardMetas | null>(null);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [showReceitaForm, setShowReceitaForm] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtroOrigemChart, setFiltroOrigemChart] = useState("");
  const [filtroParceiroChart, setFiltroParceiroChart] = useState("");
  const [filtroAnoLanc, setFiltroAnoLanc] = useState(anoAtualStr);
  const [filtroMesLanc, setFiltroMesLanc] = useState(mesAtualStr);
  const [filtroParceiroLanc, setFiltroParceiroLanc] = useState("");
  const [filtroOrigemLanc, setFiltroOrigemLanc] = useState("");
  const [paginaLanc, setPaginaLanc] = useState(1);

  const loadDados = () =>
    fetch(`/api/dashboard-metas?ano=${ano}`)
      .then((r) => r.json())
      .then(setDados)
      .catch((e) => console.error("Falha ao carregar dados do dashboard:", e));
  const loadMetas = () =>
    fetch("/api/metas")
      .then((r) => r.json())
      .then(setMetas)
      .catch((e) => console.error("Falha ao carregar metas:", e));
  const loadReceitas = () =>
    fetch("/api/receitas")
      .then((r) => r.json())
      .then(setReceitas)
      .catch((e) => console.error("Falha ao carregar lançamentos:", e));

  const loadPartners = () =>
    fetch("/api/partners")
      .then((r) => r.json())
      .then((p) =>
        setPartners(
          p
            .map((x: any) => ({ id: x.id, nome: x.nome }))
            .sort((a: Partner, b: Partner) => a.nome.localeCompare(b.nome, "pt-BR"))
        )
      )
      .catch((e) => console.error("Falha ao carregar parceiros:", e));

  useEffect(() => {
    loadDados();
  }, [ano]);

  useEffect(() => {
    loadMetas();
    loadReceitas();
    loadPartners();
  }, []);

  useEffect(() => {
    setPaginaLanc(1);
  }, [filtroAnoLanc, filtroMesLanc, filtroParceiroLanc, filtroOrigemLanc]);

  const reloadAll = () => {
    loadDados();
    loadMetas();
    loadReceitas();
    loadPartners();
  };

  const deleteMeta = async (id: string) => {
    try {
      await fetch(`/api/metas/${id}`, { method: "DELETE" });
      reloadAll();
    } catch (e) {
      alert("Não foi possível excluir a meta. Verifique sua conexão e tente novamente.");
    }
  };

  const deleteReceita = async (id: string) => {
    try {
      await fetch(`/api/receitas/${id}`, { method: "DELETE" });
      reloadAll();
    } catch (e) {
      alert("Não foi possível excluir o lançamento. Verifique sua conexão e tente novamente.");
    }
  };

  const handleImportReceitas = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Importando...");
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const res = await fetch("/api/receitas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receitas: rows }),
      });
      const result = await res.json();
      setImportMsg(
        `Importação concluída: ${result.criados} lançamento(s) criado(s).` +
          (result.erros?.length ? ` ${result.erros.length} linha(s) ignorada(s).` : "")
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      reloadAll();
    } catch (e) {
      setImportMsg("Falha na importação. Verifique sua conexão e tente novamente.");
    }
  };

  const trimestreAtual = dados?.trimestres.find((t) => t.atingido > 0 || t.meta) ?? dados?.trimestres[2];

  const mesLabel = (mesStr: string) => {
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
      new Date(2000, Number(mesStr) - 1, 1)
    );
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  };

  const anosDisponiveis = Array.from(
    new Set([anoAtualStr, ...receitas.map((r) => r.data.slice(0, 4))])
  ).sort();
  const mesesDisponiveis = Array.from(
    new Set([
      ...(!filtroAnoLanc || filtroAnoLanc === anoAtualStr ? [mesAtualStr] : []),
      ...receitas
        .filter((r) => !filtroAnoLanc || r.data.slice(0, 4) === filtroAnoLanc)
        .map((r) => r.data.slice(5, 7)),
    ])
  ).sort();

  const lancamentosFiltrados = receitas.filter((r) => {
    if (filtroAnoLanc && r.data.slice(0, 4) !== filtroAnoLanc) return false;
    if (filtroMesLanc && r.data.slice(5, 7) !== filtroMesLanc) return false;
    if (filtroParceiroLanc && (r.partnerId ?? "") !== filtroParceiroLanc) return false;
    if (filtroOrigemLanc && r.origem !== filtroOrigemLanc) return false;
    return true;
  });

  const filtrosLancAtivos = !!(filtroAnoLanc || filtroMesLanc || filtroParceiroLanc || filtroOrigemLanc);

  const totalLancFiltrado = lancamentosFiltrados.reduce((s, r) => s + r.valor, 0);
  const mediaLancFiltrado = lancamentosFiltrados.length
    ? totalLancFiltrado / lancamentosFiltrados.length
    : 0;

  const totalPaginasLanc = Math.max(1, Math.ceil(lancamentosFiltrados.length / PAGE_SIZE_LANCAMENTOS));
  const paginaAtualLanc = Math.min(paginaLanc, totalPaginasLanc);
  const lancamentosPaginados = lancamentosFiltrados.slice(
    (paginaAtualLanc - 1) * PAGE_SIZE_LANCAMENTOS,
    paginaAtualLanc * PAGE_SIZE_LANCAMENTOS
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Metas de Parcerias</h1>
          <p className="text-ink/50 text-sm mt-1">
            Meta x atingido, combinando indicações convertidas, contratos, comissões e patrocínios.
          </p>
        </div>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="input w-28"
        >
          {[ano - 1, ano, ano + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Resumo trimestral */}
      {dados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dados.trimestres.map((t) => {
            const pctRaw = t.meta ? (t.atingido / t.meta) * 100 : null;
            const pct = pctRaw != null ? Math.round(pctRaw) : null;
            const diff = t.meta ? t.atingido - t.meta : null;
            const superavit = pct != null && pct >= 100;
            const cor = superavit ? "rgb(var(--c-success))" : "rgb(var(--c-danger))";
            return (
              <div key={t.periodo} className="bg-surface border border-line rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t.label} {ano}</p>
                  {pct != null && (
                    <span className="text-xs font-semibold" style={{ color: cor }}>
                      {pct}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-semibold text-ink mt-1">{currency(t.atingido)}</p>
                <p className="text-xs text-ink/40 mt-1">
                  {t.meta ? `Meta: ${currency(t.meta)}` : "Meta não definida"}
                </p>
                {diff != null && (
                  <p className="text-xs mt-0.5" style={{ color: cor }}>
                    {superavit
                      ? `Superávit de ${currency(diff)}`
                      : `Déficit de ${currency(Math.abs(diff))}`}
                  </p>
                )}
                {t.meta && (
                  <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, (t.atingido / t.meta) * 100)}%`,
                        backgroundColor: superavit ? cor : "rgb(var(--c-amber))",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gráfico mensal */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <h2 className="font-medium text-ink mb-4">Meta x Atingido por mês — {ano}</h2>
        {dados && <BarChart data={dados.meses} />}
      </div>

      {/* Configurar metas */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-ink">Configurar metas</h2>
          <button
            onClick={() => setShowMetaForm((v) => !v)}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
          >
            {showMetaForm ? "Cancelar" : "+ Meta"}
          </button>
        </div>

        {showMetaForm && <MetaForm onSaved={() => { setShowMetaForm(false); reloadAll(); }} />}

        {metas.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhuma meta configurada ainda.</p>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-ink/40 text-xs uppercase">
                <th className="py-2">Período</th>
                <th>Tipo</th>
                <th>Valor da meta</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {metas.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">{m.periodo}</td>
                  <td>
                    <Badge value={m.tipo} />
                  </td>
                  <td>{currency(m.valorMeta)}</td>
                  <td className="text-right">
                    <button onClick={() => deleteMeta(m.id)} className="text-xs text-rose hover:underline">
                      remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Receita por origem, com filtros */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-ink">Receita por origem</h2>
          <div className="flex items-center gap-2">
            <select
              value={filtroOrigemChart}
              onChange={(e) => setFiltroOrigemChart(e.target.value)}
              className="input text-xs w-auto"
            >
              <option value="">Todas as origens</option>
              <option value="INDICACAO">Indicação convertida</option>
              <option value="CONTRATO">Parcela de contrato</option>
              <option value="COMISSAO">Comissionamento</option>
              <option value="NOVO_CONTRATO">Novo contrato</option>
              <option value="EVENTO">Patrocínio</option>
              <option value="INFLUENCIA">Influência</option>
              <option value="OUTRO">Outro</option>
            </select>
            <select
              value={filtroParceiroChart}
              onChange={(e) => setFiltroParceiroChart(e.target.value)}
              className="input text-xs w-auto"
            >
              <option value="">Todos os parceiros</option>
              {partners.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(() => {
          const filtradas = receitas.filter((r) => {
            if (filtroOrigemChart && r.origem !== filtroOrigemChart) return false;
            if (filtroParceiroChart && r.partner?.nome !== filtroParceiroChart) return false;
            return true;
          });
          const porOrigem: Record<string, number> = {};
          for (const r of filtradas) {
            porOrigem[r.origem] = (porOrigem[r.origem] ?? 0) + r.valor;
          }
          const dadosChart = Object.entries(porOrigem).map(([origem, valor]) => ({ origem, valor }));
          return <ReceitaPorOrigemChart dados={dadosChart} />;
        })()}
      </div>

      {/* Lançar receitas */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-ink">Lançamentos (o que compõe o "atingido")</h2>
            <p className="text-xs text-ink/40 mt-0.5">
              Indicações convertidas, parcelas de contrato, comissões, novos contratos e patrocínios de eventos.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-surface border border-line text-ink px-3 py-1.5 rounded-md hover:border-accent/50"
            >
              Importar planilha
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportReceitas}
              className="hidden"
            />
            <button
              onClick={() => setShowReceitaForm((v) => !v)}
              className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
            >
              {showReceitaForm ? "Cancelar" : "+ Lançamento"}
            </button>
          </div>
        </div>

        {importMsg && (
          <div className="bg-paper border border-line rounded-lg p-3 text-sm text-ink/70 flex items-center justify-between mb-4">
            <span>{importMsg}</span>
            <button onClick={() => setImportMsg(null)} className="text-ink/40 text-xs hover:underline">
              fechar
            </button>
          </div>
        )}

        <div className="bg-paper border border-line rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-ink/50">Filtros</p>
            {filtrosLancAtivos && (
              <button
                onClick={() => {
                  setFiltroAnoLanc("");
                  setFiltroMesLanc("");
                  setFiltroParceiroLanc("");
                  setFiltroOrigemLanc("");
                }}
                className="text-xs text-accent hover:underline"
              >
                limpar filtros
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <select
              value={filtroAnoLanc}
              onChange={(e) => {
                setFiltroAnoLanc(e.target.value);
                setFiltroMesLanc("");
              }}
              className="input"
            >
              <option value="">Todos os anos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={filtroMesLanc}
              onChange={(e) => setFiltroMesLanc(e.target.value)}
              className="input"
            >
              <option value="">Todos os meses</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {mesLabel(m)}
                </option>
              ))}
            </select>
            <select
              value={filtroParceiroLanc}
              onChange={(e) => setFiltroParceiroLanc(e.target.value)}
              className="input"
            >
              <option value="">Todos os parceiros</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <select
              value={filtroOrigemLanc}
              onChange={(e) => setFiltroOrigemLanc(e.target.value)}
              className="input"
            >
              <option value="">Todas as origens</option>
              {ORIGENS_LANCAMENTO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-paper border border-line rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              {filtrosLancAtivos ? "Lançamentos filtrados" : "Total de lançamentos"}
            </p>
            <p className="text-xl font-semibold text-ink mt-1">{lancamentosFiltrados.length}</p>
            {filtrosLancAtivos && (
              <p className="text-xs text-ink/40 mt-1">de {receitas.length} no total</p>
            )}
          </div>
          <div className="bg-paper border border-line rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">Total de receita</p>
            <p className="text-xl font-semibold text-ink mt-1">{currency(totalLancFiltrado)}</p>
          </div>
          <div className="bg-paper border border-line rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">Valor médio por lançamento</p>
            <p className="text-xl font-semibold text-ink mt-1">{currency(mediaLancFiltrado)}</p>
          </div>
        </div>

        <details className="bg-paper border border-line rounded-lg p-4 text-sm text-ink/60 mb-4">
          <summary className="cursor-pointer font-medium text-ink/70">
            Como montar a planilha de importação
          </summary>
          <div className="mt-3 space-y-2">
            <p>Colunas na primeira linha, exportado como CSV:</p>
            <code className="block bg-surface border border-line rounded-md p-2 text-xs overflow-x-auto">
              origem,parceiro,valor,data,descricao
            </code>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>origem</b>: INDICACAO, CONTRATO, COMISSAO, NOVO_CONTRATO, EVENTO, INFLUENCIA ou OUTRO</li>
              <li><b>parceiro</b>: nome do parceiro (opcional — deixe em branco se não se aplica; precisa bater com o nome já cadastrado)</li>
              <li><b>valor</b>: aceita formato brasileiro (1.234,56) ou simples (1234.56)</li>
              <li><b>data</b>: dd/mm/aaaa ou aaaa-mm-dd</li>
            </ul>
          </div>
        </details>

        {showReceitaForm && (
          <ReceitaForm
            partners={partners}
            onSaved={() => { setShowReceitaForm(false); reloadAll(); }}
            onPartnerCreated={loadPartners}
          />
        )}

        {receitas.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhum lançamento registrado ainda.</p>
        ) : lancamentosFiltrados.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhum lançamento bate com os filtros aplicados.</p>
        ) : (
          <>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-ink/40 text-xs uppercase">
                  <th className="py-2">Origem</th>
                  <th>Parceiro</th>
                  <th>Descrição</th>
                  <th>Nº NF</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lancamentosPaginados.map((r) => (
                  <ReceitaRow key={r.id} receita={r} partners={partners} onSaved={reloadAll} />
                ))}
              </tbody>
            </table>

            {totalPaginasLanc > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-ink/50">
                <span>
                  Página {paginaAtualLanc} de {totalPaginasLanc} — {lancamentosFiltrados.length} lançamento(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginaLanc((p) => Math.max(1, p - 1))}
                    disabled={paginaAtualLanc === 1}
                    className="text-xs bg-surface border border-line text-ink px-3 py-1.5 rounded-md disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPaginaLanc((p) => Math.min(totalPaginasLanc, p + 1))}
                    disabled={paginaAtualLanc === totalPaginasLanc}
                    className="text-xs bg-surface border border-line text-ink px-3 py-1.5 rounded-md disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .input {
          border: 1px solid rgb(var(--input-border));
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          width: 100%;
          background-color: rgb(var(--input-bg));
          color: rgb(var(--c-ink));
        }
      `}</style>
    </div>
  );
}

function MetaForm({ onSaved }: { onSaved: () => void }) {
  const [tipo, setTipo] = useState("MENSAL");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(1);
  const [trimestre, setTrimestre] = useState(1);
  const [valorMeta, setValorMeta] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const periodo =
      tipo === "MENSAL"
        ? `${ano}-${String(mes).padStart(2, "0")}`
        : tipo === "TRIMESTRAL"
        ? `${ano}-Q${trimestre}`
        : `${ano}`;

    try {
      await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo, tipo, valorMeta: Number(valorMeta) }),
      });
      onSaved();
    } catch (e) {
      alert("Não foi possível salvar a meta. Verifique sua conexão e tente novamente.");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mb-4 bg-paper p-4 rounded-md">
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
        <option value="MENSAL">Mensal</option>
        <option value="TRIMESTRAL">Trimestral</option>
        <option value="ANUAL">Anual</option>
      </select>
      <input
        type="number"
        value={ano}
        onChange={(e) => setAno(Number(e.target.value))}
        className="input"
        placeholder="Ano"
      />
      {tipo === "MENSAL" && (
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="input">
          {[
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
          ].map((label, idx) => (
            <option key={idx} value={idx + 1}>
              {label}
            </option>
          ))}
        </select>
      )}
      {tipo === "TRIMESTRAL" && (
        <select
          value={trimestre}
          onChange={(e) => setTrimestre(Number(e.target.value))}
          className="input"
        >
          <option value={1}>Q1 (Jan-Mar)</option>
          <option value={2}>Q2 (Abr-Jun)</option>
          <option value={3}>Q3 (Jul-Set)</option>
          <option value={4}>Q4 (Out-Dez)</option>
        </select>
      )}
      <input
        required
        type="number"
        placeholder="Valor da meta (R$)"
        value={valorMeta}
        onChange={(e) => setValorMeta(e.target.value)}
        className="input"
      />
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar meta"}
      </button>
    </form>
  );
}

function ReceitaForm({
  partners,
  onSaved,
  onPartnerCreated,
}: {
  partners: Partner[];
  onSaved: () => void;
  onPartnerCreated?: () => Promise<void> | void;
}) {
  const [origem, setOrigem] = useState("INDICACAO");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [saving, setSaving] = useState(false);

  const [novoParceiroNome, setNovoParceiroNome] = useState("");
  const [novoParceiroTier, setNovoParceiroTier] = useState("BRONZE");
  const [savingNovoParceiro, setSavingNovoParceiro] = useState(false);
  const mostrarNovoParceiro = partnerId === "__novo__";

  const cadastrarNovoParceiro = async () => {
    if (!novoParceiroNome.trim()) {
      alert("Digite o nome do novo parceiro.");
      return;
    }
    setSavingNovoParceiro(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoParceiroNome, tier: novoParceiroTier }),
      });
      const novoPartner = await res.json();
      if (onPartnerCreated) await onPartnerCreated();
      setPartnerId(novoPartner.id);
      setNovoParceiroNome("");
    } catch (e) {
      alert("Não foi possível cadastrar o parceiro. Verifique sua conexão e tente novamente.");
    }
    setSavingNovoParceiro(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let idParaUsar = partnerId;

    try {
      // Se escolheu "cadastrar novo parceiro", cria o partner primeiro
      if (mostrarNovoParceiro) {
        if (!novoParceiroNome.trim()) {
          setSaving(false);
          alert("Digite o nome do novo parceiro.");
          return;
        }
        const resPartner = await fetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: novoParceiroNome, tier: novoParceiroTier }),
        });
        const novoPartner = await resPartner.json();
        idParaUsar = novoPartner.id;
      }

      await fetch("/api/receitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem,
          valor,
          data,
          partnerId: idParaUsar && idParaUsar !== "__novo__" ? idParaUsar : null,
          descricao,
          numeroNota,
        }),
      });
      onSaved();
    } catch (e) {
      alert("Não foi possível salvar o lançamento. Verifique sua conexão e tente novamente.");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-6 gap-3 mb-4 bg-paper p-4 rounded-md">
      <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="input">
        <option value="INDICACAO">Indicação convertida</option>
        <option value="CONTRATO">Parcela de contrato</option>
        <option value="COMISSAO">Comissão</option>
        <option value="NOVO_CONTRATO">Novo contrato</option>
        <option value="EVENTO">Patrocínio de evento</option>
        <option value="INFLUENCIA">Influência</option>
        <option value="LOCACAO_ESPACO">Locação de espaço</option>
        <option value="OUTRO">Outro</option>
      </select>
      <select
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
        className="input"
      >
        <option value="">Sem parceiro específico</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
        <option value="__novo__">+ Cadastrar novo parceiro...</option>
      </select>

      {mostrarNovoParceiro && (
        <div className="md:col-span-6 bg-surface border border-line rounded-md p-3 space-y-2">
          <div className="grid md:grid-cols-4 gap-3">
            <input
              required
              placeholder="Nome do novo parceiro"
              value={novoParceiroNome}
              onChange={(e) => setNovoParceiroNome(e.target.value)}
              className="input md:col-span-2"
            />
            <select
              value={novoParceiroTier}
              onChange={(e) => setNovoParceiroTier(e.target.value)}
              className="input"
            >
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="BRONZE">Bronze</option>
            </select>
            <button
              type="button"
              onClick={cadastrarNovoParceiro}
              disabled={savingNovoParceiro}
              className="bg-accent text-white text-sm rounded-md px-3 py-2 disabled:opacity-50"
            >
              {savingNovoParceiro ? "Cadastrando..." : "Cadastrar parceiro"}
            </button>
          </div>
          <p className="text-xs text-ink/40">
            Cadastra o parceiro imediatamente e já seleciona ele acima — depois é só completar o resto (contato, ICP, etc.) na tela de Partners. Depois, preencha valor/data abaixo e salve o lançamento normalmente.
          </p>
        </div>
      )}

      <CurrencyInput
        required
        placeholder="Valor (R$)"
        value={valor}
        onChange={setValor}
        className="input"
      />
      <input
        required
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="input"
      />
      <input
        placeholder="Descrição (ex: Patrocínio Pokernight)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="input md:col-span-2"
      />
      <input
        placeholder="Nº da NF"
        value={numeroNota}
        onChange={(e) => setNumeroNota(e.target.value)}
        className="input"
      />
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 py-2 md:col-span-6 w-fit disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar lançamento"}
      </button>
    </form>
  );
}

const ORIGENS_LANCAMENTO = [
  { value: "INDICACAO", label: "Indicação convertida" },
  { value: "CONTRATO", label: "Parcela de contrato" },
  { value: "COMISSAO", label: "Comissionamento" },
  { value: "NOVO_CONTRATO", label: "Novo contrato" },
  { value: "EVENTO", label: "Patrocínio" },
  { value: "INFLUENCIA", label: "Influência" },
  { value: "LOCACAO_ESPACO", label: "Locação de espaço" },
  { value: "OUTRO", label: "Outro" },
];

function ReceitaRow({
  receita: r,
  partners,
  onSaved,
}: {
  receita: Receita;
  partners: Partner[];
  onSaved: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [origem, setOrigem] = useState(r.origem);
  const [partnerId, setPartnerId] = useState(r.partnerId ?? "");
  const [valor, setValor] = useState(r.valor);
  const [data, setData] = useState(r.data.slice(0, 10));
  const [descricao, setDescricao] = useState(r.descricao ?? "");
  const [numeroNota, setNumeroNota] = useState(r.numeroNota ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    try {
      await fetch(`/api/receitas/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem,
          partnerId: partnerId || null,
          valor,
          data,
          descricao,
          numeroNota: numeroNota || null,
        }),
      });
      setEditando(false);
      onSaved();
    } catch (e) {
      alert("Não foi possível salvar o lançamento. Verifique sua conexão e tente novamente.");
    }
    setSaving(false);
  };

  const excluir = async () => {
    try {
      await fetch(`/api/receitas/${r.id}`, { method: "DELETE" });
      onSaved();
    } catch (e) {
      alert("Não foi possível excluir o lançamento. Verifique sua conexão e tente novamente.");
    }
  };

  if (editando) {
    return (
      <tr className="bg-paper">
        <td className="py-2" colSpan={7}>
          <div className="grid md:grid-cols-7 gap-2 items-center">
            <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="input">
              {ORIGENS_LANCAMENTO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="input"
            >
              <option value="">Sem parceiro específico</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <CurrencyInput
              value={valor}
              onChange={setValor}
              className="input"
              placeholder="Valor"
            />
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="input"
              placeholder="Descrição"
            />
            <input
              value={numeroNota}
              onChange={(e) => setNumeroNota(e.target.value)}
              className="input"
              placeholder="Nº da NF"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={salvar}
                disabled={saving}
                className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setEditando(false)} className="text-xs text-ink/50 hover:underline">
                cancelar
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="py-2">
        <Badge value={r.origem} />
      </td>
      <td className="text-xs">{r.partner?.nome ?? "—"}</td>
      <td className="text-xs text-ink/60">{r.descricao ?? "—"}</td>
      <td className="text-xs text-ink/60">{r.numeroNota ?? "—"}</td>
      <td className="text-xs">{currency(r.valor)}</td>
      <td className="text-ink/50 text-xs">{dateFmt(r.data)}</td>
      <td className="text-right whitespace-nowrap">
        {excluindo ? (
          <span className="flex items-center justify-end gap-2">
            <span className="text-xs text-ink/50">Excluir?</span>
            <button onClick={excluir} className="text-xs bg-rose text-white px-2 py-1 rounded-md">
              Confirmar
            </button>
            <button onClick={() => setExcluindo(false)} className="text-xs text-ink/50 hover:underline">
              cancelar
            </button>
          </span>
        ) : (
          <span className="flex items-center justify-end gap-3">
            <button onClick={() => setEditando(true)} className="text-xs text-accent hover:underline">
              editar
            </button>
            <button onClick={() => setExcluindo(true)} className="text-xs text-rose hover:underline">
              remover
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
