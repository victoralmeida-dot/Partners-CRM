"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import RankingChart from "@/components/RankingChart";
import MetasParceiroMesTable from "@/components/MetasParceiroMesTable";
import { exportarCSV } from "@/lib/exportarCSV";

type Indicacao = {
  id: string;
  leadNome: string;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
  faturamento: number | null;
  quemIndicou: string | null;
  status: string;
  observacoes: string | null;
  revisitarEm: string | null;
  data: string;
  partner: { id: string; nome: string; contatoEmail: string | null; contatoPrincipal: string | null };
  comissao: { valor: number; tipo: string; statusPagamento: string } | null;
};

type Partner = { id: string; nome: string };
type Consultor = { id: string; nome: string; email: string | null; telefone: string | null };
type Nota = { id: string; indicacaoId: string; texto: string; createdAt: string };
type MetaParceiroMes = {
  id: string;
  partnerId: string;
  partnerNome: string;
  valorMeta: number;
  realizado: number;
  pct: number;
};

const colunas = [
  { key: "LEAD_POTENCIAL", label: "Lead Potencial", cor: "139 92 246" }, // violeta
  { key: "ENVIADA", label: "Enviada", cor: "59 130 246" },      // azul
  { key: "NEGOCIACAO", label: "Negociação", cor: "215 163 46" }, // amarelo/âmbar
  { key: "EM_ESPERA", label: "Em espera / Revisitar", cor: "148 152 162" }, // cinza
  { key: "CONVERTIDA", label: "Convertida", cor: "52 211 153" }, // verde
  { key: "PERDIDA", label: "Perdida", cor: "229 72 77" },        // vermelho
];

// Status que usam o campo revisitarEm pra lembrete de retomar contato.
const STATUS_COM_REVISITA = ["EM_ESPERA", "LEAD_POTENCIAL"];

const hoje = () => new Date().toISOString().slice(0, 10);

// Desligado por ora — revisar layout/necessidade desse atalho no futuro.
const MOSTRAR_AVISAR_PARCEIRO = false;

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// form.faturamento guarda só os dígitos (centavos); aqui formatamos pra exibição (1.234.567,89)
const formatarFaturamentoInput = (digits: string) => {
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dataHoraFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

// Monta um mailto: com assunto e corpo já preenchidos — abre no programa de
// e-mail padrão do usuário, sem mandar nada sozinho. Ele revisa e envia.
function montarLinkAviso(i: Indicacao): string {
  const saudacao = i.partner.contatoPrincipal ? `Olá, ${i.partner.contatoPrincipal}!` : "Olá!";
  const linhas = [
    saudacao,
    "",
    "Temos uma nova indicação da Ecommerce Puro para vocês:",
    "",
    `Cliente: ${i.leadNome}`,
    i.telefone ? `Telefone: ${i.telefone}` : null,
    i.email ? `E-mail: ${i.email}` : null,
    i.cnpj ? `CNPJ: ${i.cnpj}` : null,
    i.faturamento != null ? `Faturamento: ${currency(i.faturamento)}` : null,
    i.observacoes ? `\nContexto: ${i.observacoes}` : null,
    "",
    "Qualquer dúvida, fico à disposição.",
    "",
    "Abraço,",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const params = new URLSearchParams({
    subject: `Nova indicação da Ecommerce Puro — ${i.leadNome}`,
    body: linhas,
  });

  return `mailto:${i.partner.contatoEmail ?? ""}?${params.toString()}`;
}

const emptyForm = {
  leadNome: "",
  telefone: "",
  email: "",
  cnpj: "",
  faturamento: "",
  partnerId: "",
  quemIndicou: "",
  observacoes: "",
};

export default function IndicacoesPage() {
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showConsultores, setShowConsultores] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [metasParceiroMes, setMetasParceiroMes] = useState<MetaParceiroMes[]>([]);

  const hojeData = new Date();
  const primeiroDiaMesAtual = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const ultimoDiaMesAtual = new Date(hojeData.getFullYear(), hojeData.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [filtroPartnerId, setFiltroPartnerId] = useState("");
  const [filtroConsultor, setFiltroConsultor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState(primeiroDiaMesAtual);
  const [filtroDataFim, setFiltroDataFim] = useState(ultimoDiaMesAtual);

  // Reaproveita o mesmo endpoint/fórmula de metas por parceiro já usado na Dashboard.
  const loadMetas = () =>
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setMetasParceiroMes(d.metasParceiroMes ?? []));

  // `load` recarrega indicações E metas juntos — toda indicação nova/alterada
  // pode mudar o "realizado" da meta do mês, então os dois têm que andar
  // juntos (antes, metas só carregava 1x no mount e nunca mais atualizava).
  const load = () => {
    fetch("/api/indicacoes").then((r) => r.json()).then(setIndicacoes);
    loadMetas();
  };
  const loadNotas = () => fetch("/api/notas-indicacao").then((r) => r.json()).then(setNotas);
  const loadConsultores = () =>
    fetch("/api/consultores").then((r) => r.json()).then(setConsultores);

  useEffect(() => {
    load();
    loadNotas();
    loadConsultores();
    fetch("/api/partners")
      .then((r) => r.json())
      .then((p) => setPartners(p.map((x: any) => ({ id: x.id, nome: x.nome }))));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/indicacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        faturamento: form.faturamento ? Number(form.faturamento) / 100 : null,
      }),
    });
    setSaving(false);
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  // Aplica os 3 filtros (parceiro, consultor, período) — tudo abaixo (stats,
  // ranking, kanban, exportação) reflete só o que estiver filtrado.
  const indicacoesFiltradas = indicacoes.filter((i) => {
    if (filtroPartnerId && i.partner.id !== filtroPartnerId) return false;
    if (filtroConsultor && (i.quemIndicou ?? "") !== filtroConsultor) return false;
    if (filtroDataInicio && i.data.slice(0, 10) < filtroDataInicio) return false;
    if (filtroDataFim && i.data.slice(0, 10) > filtroDataFim) return false;
    return true;
  });

  const filtrosAtivos = !!(filtroPartnerId || filtroConsultor || filtroDataInicio || filtroDataFim);

  const metasParceiroMesFiltradas = filtroPartnerId
    ? metasParceiroMes.filter((m) => m.partnerId === filtroPartnerId)
    : metasParceiroMes;

  const limparFiltros = () => {
    setFiltroPartnerId("");
    setFiltroConsultor("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  // Estatísticas dos clientes indicados
  const totalIndicacoes = indicacoesFiltradas.length;
  const totalConvertidas = indicacoesFiltradas.filter((i) => i.status === "CONVERTIDA").length;
  const taxaConversao = totalIndicacoes > 0 ? totalConvertidas / totalIndicacoes : 0;
  const faturamentoTotal = indicacoesFiltradas.reduce((sum, i) => sum + (i.faturamento ?? 0), 0);

  const porConsultor: Record<string, { total: number; convertidas: number }> = {};
  for (const i of indicacoesFiltradas) {
    const key = i.quemIndicou || "Sem consultor definido";
    if (!porConsultor[key]) porConsultor[key] = { total: 0, convertidas: 0 };
    porConsultor[key].total += 1;
    if (i.status === "CONVERTIDA") porConsultor[key].convertidas += 1;
  }
  const rankingConsultores = Object.entries(porConsultor).sort((a, b) => b[1].total - a[1].total);

  const porParceiro: Record<string, number> = {};
  for (const i of indicacoesFiltradas) {
    porParceiro[i.partner.nome] = (porParceiro[i.partner.nome] ?? 0) + 1;
  }
  const rankingParceiros = Object.entries(porParceiro)
    .map(([nome, total]) => ({ label: nome, value: total }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Indicações</h1>
          <p className="text-ink/50 text-sm mt-1">
            Acompanhe o funil de indicações entre a EP e os partners.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const linhas = indicacoesFiltradas.map((i) => ({
                lead: i.leadNome,
                parceiro: i.partner.nome,
                quemIndicou: i.quemIndicou ?? "",
                status: i.status,
                telefone: i.telefone ?? "",
                email: i.email ?? "",
                cnpj: i.cnpj ?? "",
                faturamento: i.faturamento ?? "",
                data: i.data.slice(0, 10),
                contexto: i.observacoes ?? "",
              }));
              exportarCSV(`indicacoes-${new Date().toISOString().slice(0, 10)}.csv`, linhas);
            }}
            className="bg-surface border border-line text-ink text-sm px-4 py-2 rounded-md hover:border-accent/50"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setShowConsultores((v) => !v)}
            className="bg-surface border border-line text-ink text-sm px-4 py-2 rounded-md hover:border-accent/50"
          >
            Consultores
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/90"
          >
            {showForm ? "Cancelar" : "+ Nova Indicação"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-surface border border-line rounded-lg p-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Nome do mentorado">
              <input
                required
                value={form.leadNome}
                onChange={(e) => setForm({ ...form, leadNome: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="input"
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="CNPJ">
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="input"
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label="Faturamento (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={formatarFaturamentoInput(form.faturamento)}
                onChange={(e) =>
                  setForm({ ...form, faturamento: e.target.value.replace(/\D/g, "") })
                }
                className="input"
                placeholder="0,00"
              />
            </Field>
            <Field label="Parceiro indicado">
              <select
                required
                value={form.partnerId}
                onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                className="input"
              >
                <option value="">Selecione...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quem indicou">
              <select
                value={form.quemIndicou}
                onChange={(e) => setForm({ ...form, quemIndicou: e.target.value })}
                className="input"
              >
                <option value="">Selecione...</option>
                {consultores.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Contexto da necessidade (qual dor ou situação motivou a indicação)">
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="input"
              rows={2}
              placeholder="Ex: cliente reclamou de erro de estoque em 3 pedidos seguidos, precisa de WMS"
            />
          </Field>
          <button
            disabled={saving}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar indicação"}
          </button>
        </form>
      )}

      {showConsultores && (
        <ConsultoresPanel
          consultores={consultores}
          onChanged={loadConsultores}
        />
      )}

      <div className="bg-surface border border-line rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-ink/50">Filtros</p>
          {filtrosAtivos && (
            <button onClick={limparFiltros} className="text-xs text-accent hover:underline">
              limpar filtros
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <select
            value={filtroPartnerId}
            onChange={(e) => setFiltroPartnerId(e.target.value)}
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
            value={filtroConsultor}
            onChange={(e) => setFiltroConsultor(e.target.value)}
            className="input"
          >
            <option value="">Todos os consultores</option>
            {consultores.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
          <label className="block">
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="input"
              title="De"
            />
          </label>
          <label className="block">
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="input"
              title="Até"
            />
          </label>
        </div>
        {filtrosAtivos && (
          <p className="text-xs text-ink/40 mt-3">
            Mostrando {indicacoesFiltradas.length} de {indicacoes.length} indicações.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">Total de indicações</p>
          <p className="text-xl font-semibold text-ink mt-1">{totalIndicacoes}</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">Taxa de conversão</p>
          <p className="text-xl font-semibold text-ink mt-1">{(taxaConversao * 100).toFixed(0)}%</p>
          <p className="text-xs text-ink/40 mt-1">{totalConvertidas} convertidas</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">Faturamento dos indicados</p>
          <p className="text-xl font-semibold text-ink mt-1">{currency(faturamentoTotal)}</p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <h2 className="font-medium text-ink mb-3">Metas de indicação por parceiro (mês atual)</h2>
        <MetasParceiroMesTable metas={metasParceiroMesFiltradas} />
      </div>

      {rankingConsultores.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface border border-line rounded-lg p-5">
            <h2 className="font-medium text-ink mb-4">Quem indicou mais</h2>
            <RankingChart
              items={rankingConsultores.map(([nome, s]) => ({
                label: nome,
                value: s.total,
                sublabel: `${s.convertidas} convertidas`,
              }))}
            />
          </div>
          <div className="bg-surface border border-line rounded-lg p-5">
            <h2 className="font-medium text-ink mb-4">Parceiro mais indicado</h2>
            <RankingChart items={rankingParceiros} color="rgb(var(--c-success))" />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        {colunas.map((col) => {
          const items = indicacoesFiltradas.filter((i) => i.status === col.key);
          const atrasadas = STATUS_COM_REVISITA.includes(col.key)
            ? items.filter((i) => i.revisitarEm && i.revisitarEm.slice(0, 10) < hoje()).length
            : 0;
          return (
            <div
              key={col.key}
              className="border rounded-lg p-3 min-w-0"
              style={{
                backgroundColor: `rgb(${col.cor} / 0.08)`,
                borderColor: `rgb(${col.cor} / 0.25)`,
              }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold" style={{ color: `rgb(${col.cor})` }}>
                  {col.label}
                </h2>
                <div className="flex items-center gap-1.5">
                  {atrasadas > 0 && (
                    <span
                      className="text-xs font-medium rounded-full px-1.5 bg-rose/15 text-rose"
                      title={`${atrasadas} com revisita atrasada`}
                    >
                      ⚠️ {atrasadas}
                    </span>
                  )}
                  <span
                    className="text-xs font-medium rounded-full px-1.5"
                    style={{ color: `rgb(${col.cor})`, backgroundColor: `rgb(${col.cor} / 0.15)` }}
                  >
                    {items.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 min-w-0">
                {items.map((i) => (
                  <IndicacaoCard
                    key={i.id}
                    indicacao={i}
                    colunas={colunas}
                    consultores={consultores}
                    notas={notas.filter((n) => n.indicacaoId === i.id)}
                    onSaved={load}
                    onNotasSaved={loadNotas}
                  />
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-ink/30 px-1 py-4 text-center">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-ink/50 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ConsultoresPanel({
  consultores,
  onChanged,
}: {
  consultores: Consultor[];
  onChanged: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/consultores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error || `Erro ao salvar (HTTP ${res.status}).`);
        return;
      }
      setNome("");
      setEmail("");
      setTelefone("");
      onChanged();
    } catch (e: any) {
      setErro("Falha de conexão com o servidor: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esse consultor da lista de novos cadastros? Indicações antigas continuam mostrando o nome normalmente.")) return;
    await fetch(`/api/consultores/${id}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-5 space-y-4">
      <div>
        <h2 className="font-medium text-ink">Consultores que podem indicar</h2>
        <p className="text-xs text-ink/40 mt-0.5">
          Cadastre aqui cada novo consultor/mentor antes de usá-lo em "Quem indicou".
        </p>
      </div>

      {erro && (
        <p className="text-sm bg-rose/10 text-rose rounded-md p-2">{erro}</p>
      )}

      <form onSubmit={adicionar} className="grid md:grid-cols-4 gap-2">
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="input"
          placeholder="Nome *"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="E-mail (opcional)"
        />
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="input"
          placeholder="Telefone (opcional)"
        />
        <button
          disabled={saving}
          className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? "Adicionando..." : "+ Adicionar"}
        </button>
      </form>

      {consultores.length === 0 ? (
        <p className="text-xs text-ink/40">Nenhum consultor cadastrado ainda.</p>
      ) : (
        <div className="divide-y divide-line">
          {consultores.map((c) =>
            editandoId === c.id ? (
              <ConsultorEditRow
                key={c.id}
                consultor={c}
                onSaved={() => {
                  setEditandoId(null);
                  onChanged();
                }}
                onCancel={() => setEditandoId(null)}
              />
            ) : (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{c.nome}</p>
                  <p className="text-xs text-ink/40">
                    {c.email || "sem e-mail"} {c.telefone ? `· ${c.telefone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setEditandoId(c.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </button>
                  <button onClick={() => remover(c.id)} className="text-xs text-rose hover:underline">
                    remover
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ConsultorEditRow({
  consultor,
  onSaved,
  onCancel,
}: {
  consultor: Consultor;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(consultor.nome);
  const [email, setEmail] = useState(consultor.email ?? "");
  const [telefone, setTelefone] = useState(consultor.telefone ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    await fetch(`/api/consultores/${consultor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, telefone }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="grid md:grid-cols-4 gap-2 py-2 items-center">
      <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="E-mail" />
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" placeholder="Telefone" />
      <div className="flex items-center gap-2">
        <button
          onClick={salvar}
          disabled={saving}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} className="text-xs text-ink/50 hover:underline">
          cancelar
        </button>
      </div>
    </div>
  );
}

function IndicacaoCard({
  indicacao: i,
  colunas,
  consultores,
  notas,
  onSaved,
  onNotasSaved,
}: {
  indicacao: Indicacao;
  colunas: { key: string; label: string; cor: string }[];
  consultores: Consultor[];
  notas: Nota[];
  onSaved: () => void;
  onNotasSaved: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoObs, setEditandoObs] = useState(false);
  const [obs, setObs] = useState(i.observacoes ?? "");
  const [editandoConsultor, setEditandoConsultor] = useState(false);
  const [consultorSelecionado, setConsultorSelecionado] = useState(i.quemIndicou ?? "");
  const [revisitarEm, setRevisitarEm] = useState(i.revisitarEm ? i.revisitarEm.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [savingNota, setSavingNota] = useState(false);
  const [editandoDadosCliente, setEditandoDadosCliente] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    leadNome: i.leadNome,
    telefone: i.telefone ?? "",
    email: i.email ?? "",
    cnpj: i.cnpj ?? "",
    faturamento: i.faturamento != null ? Math.round(i.faturamento * 100).toString() : "",
  });

  const abrirModal = () => {
    setClienteForm({
      leadNome: i.leadNome,
      telefone: i.telefone ?? "",
      email: i.email ?? "",
      cnpj: i.cnpj ?? "",
      faturamento: i.faturamento != null ? Math.round(i.faturamento * 100).toString() : "",
    });
    setEditandoDadosCliente(false);
    setModalAberto(true);
  };

  const adicionarNota = async () => {
    if (!novaNota.trim()) return;
    setSavingNota(true);
    await fetch("/api/notas-indicacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indicacaoId: i.id, texto: novaNota.trim() }),
    });
    setNovaNota("");
    setSavingNota(false);
    onNotasSaved();
  };

  const excluirNota = async (notaId: string) => {
    await fetch(`/api/notas-indicacao/${notaId}`, { method: "DELETE" });
    onNotasSaved();
  };

  const atrasada = !!i.revisitarEm && i.revisitarEm.slice(0, 10) < hoje();

  const salvarRevisitarEm = async (valor: string) => {
    setRevisitarEm(valor);
    await fetch(`/api/indicacoes/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisitarEm: valor || null }),
    });
    onSaved();
  };

  const moveStatus = async (status: string) => {
    // O auto-preenchimento de revisitarEm (+30 dias, quando o status entra em
    // LEAD_POTENCIAL/EM_ESPERA sem revisita já marcada) é decidido no backend
    // (PUT /api/indicacoes/[id]) — assim vale igual em qualquer tela que mude status.
    const res = await fetch(`/api/indicacoes/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const atualizado = await res.json();
    setRevisitarEm(atualizado.revisitarEm ? atualizado.revisitarEm.slice(0, 10) : "");
    onSaved();
  };

  const salvarObs = async () => {
    setSaving(true);
    await fetch(`/api/indicacoes/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacoes: obs }),
    });
    setSaving(false);
    setEditandoObs(false);
    onSaved();
  };

  const salvarConsultor = async () => {
    setSaving(true);
    await fetch(`/api/indicacoes/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quemIndicou: consultorSelecionado }),
    });
    setSaving(false);
    setEditandoConsultor(false);
    onSaved();
  };

  const salvarCliente = async () => {
    setSavingCliente(true);
    await fetch(`/api/indicacoes/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadNome: clienteForm.leadNome,
        telefone: clienteForm.telefone || null,
        email: clienteForm.email || null,
        cnpj: clienteForm.cnpj || null,
        faturamento: clienteForm.faturamento ? Number(clienteForm.faturamento) / 100 : null,
      }),
    });
    setSavingCliente(false);
    setEditandoDadosCliente(false);
    onSaved();
  };

  return (
    <div className="border border-line rounded-md p-3 text-sm bg-surface">
      <p className="font-medium text-ink">{i.leadNome}</p>
      <p className="text-xs text-ink/50 mt-0.5">{i.partner.nome}</p>

      {editandoConsultor ? (
        <div className="flex items-center gap-1.5 mt-1">
          <select
            value={consultorSelecionado}
            onChange={(e) => setConsultorSelecionado(e.target.value)}
            className="text-xs border border-line rounded-md px-1.5 py-1 flex-1 min-w-0"
            style={{ backgroundColor: "rgb(var(--input-bg))", color: "rgb(var(--c-ink))" }}
          >
            <option value="">Sem consultor</option>
            {consultores.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            onClick={salvarConsultor}
            disabled={saving}
            className="text-xs text-accent hover:underline shrink-0"
          >
            salvar
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink/40 mt-0.5">
          Indicado por: {i.quemIndicou || <span className="italic">não definido</span>}{" "}
          <button
            onClick={() => setEditandoConsultor(true)}
            className="text-accent hover:underline"
          >
            editar
          </button>
        </p>
      )}

      {i.faturamento != null && (
        <p className="text-xs text-ink/40">Faturamento: {currency(i.faturamento)}</p>
      )}

      {STATUS_COM_REVISITA.includes(i.status) && (
        <div className="mt-1.5 space-y-1">
          <span className={`text-xs block ${atrasada ? "text-rose font-medium" : "text-ink/50"}`}>
            {atrasada ? "⚠️ Revisitar em:" : "Revisitar em:"}
          </span>
          <input
            type="date"
            value={revisitarEm}
            onChange={(e) => salvarRevisitarEm(e.target.value)}
            className={`text-xs border rounded-md px-1.5 py-0.5 w-full ${
              atrasada ? "border-rose text-rose" : "border-line text-ink"
            }`}
            style={{ backgroundColor: "rgb(var(--input-bg))" }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mt-1.5">
        <button onClick={abrirModal} className="text-xs text-accent hover:underline">
          Ver mais ▼
        </button>
        {MOSTRAR_AVISAR_PARCEIRO && (
          i.partner.contatoEmail ? (
            <a
              href={montarLinkAviso(i)}
              className="text-xs text-accent hover:underline"
              title={`Abre um e-mail pronto pra ${i.partner.contatoEmail}`}
            >
              ✉️ Avisar parceiro
            </a>
          ) : (
            <span className="text-xs text-ink/30" title="Cadastre um e-mail de contato no parceiro">
              ✉️ sem e-mail cadastrado
            </span>
          )
        )}
      </div>

      <select
        value={i.status}
        onChange={(e) => moveStatus(e.target.value)}
        className="mt-2 w-full text-xs border border-line rounded-md px-1.5 py-1"
      >
        {colunas.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>

      {modalAberto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-surface border border-line rounded-lg p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-ink">{i.leadNome}</h3>
                <p className="text-xs text-ink/50">{i.partner.nome}</p>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-ink/40 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/50 font-medium">Dados do cliente</span>
                {!editandoDadosCliente && (
                  <button
                    onClick={() => setEditandoDadosCliente(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </button>
                )}
              </div>

              {editandoDadosCliente ? (
                <div className="mt-2 space-y-3">
                  <Field label="Nome do cliente">
                    <input
                      value={clienteForm.leadNome}
                      onChange={(e) => setClienteForm({ ...clienteForm, leadNome: e.target.value })}
                      className="input"
                    />
                  </Field>
                  <Field label="Telefone">
                    <input
                      value={clienteForm.telefone}
                      onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })}
                      className="input"
                      placeholder="(11) 99999-9999"
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      type="email"
                      value={clienteForm.email}
                      onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                      className="input"
                    />
                  </Field>
                  <Field label="CNPJ">
                    <input
                      value={clienteForm.cnpj}
                      onChange={(e) => setClienteForm({ ...clienteForm, cnpj: e.target.value })}
                      className="input"
                      placeholder="00.000.000/0000-00"
                    />
                  </Field>
                  <Field label="Faturamento (R$)">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatarFaturamentoInput(clienteForm.faturamento)}
                      onChange={(e) =>
                        setClienteForm({ ...clienteForm, faturamento: e.target.value.replace(/\D/g, "") })
                      }
                      className="input"
                      placeholder="0,00"
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={salvarCliente}
                      disabled={savingCliente || !clienteForm.leadNome.trim()}
                      className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
                    >
                      {savingCliente ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => {
                        setClienteForm({
                          leadNome: i.leadNome,
                          telefone: i.telefone ?? "",
                          email: i.email ?? "",
                          cnpj: i.cnpj ?? "",
                          faturamento:
                            i.faturamento != null ? Math.round(i.faturamento * 100).toString() : "",
                        });
                        setEditandoDadosCliente(false);
                      }}
                      className="text-xs text-ink/50 hover:underline"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 space-y-1 text-xs text-ink/60">
                  <p>📞 {i.telefone || <span className="text-ink/30">não informado</span>}</p>
                  <p>✉️ {i.email || <span className="text-ink/30">não informado</span>}</p>
                  <p>🏢 CNPJ: {i.cnpj || <span className="text-ink/30">não informado</span>}</p>
                  <p>
                    💰 Faturamento:{" "}
                    {i.faturamento != null ? (
                      currency(i.faturamento)
                    ) : (
                      <span className="text-ink/30">não informado</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/50 font-medium">Contexto da necessidade</span>
                {!editandoObs && (
                  <button
                    onClick={() => setEditandoObs(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </button>
                )}
              </div>
              {editandoObs ? (
                <div className="mt-1 space-y-1.5">
                  <textarea
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    className="input text-xs"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={salvarObs}
                      disabled={saving}
                      className="text-xs bg-accent text-white px-2 py-1 rounded-md disabled:opacity-50"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => {
                        setObs(i.observacoes ?? "");
                        setEditandoObs(false);
                      }}
                      className="text-xs text-ink/50 hover:underline"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink/60 mt-1 italic">
                  {i.observacoes ? `"${i.observacoes}"` : "Nenhuma observação registrada ainda."}
                </p>
              )}
            </div>

            <div className="border-t border-line pt-3">
              <span className="text-xs text-ink/50 font-medium">Notas / Follow-up</span>

              {notas.length > 0 && (
                <ul className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notas.map((n) => (
                    <li
                      key={n.id}
                      className="bg-paper border border-line rounded-md p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-ink/70 break-words">{n.texto}</p>
                        <p className="text-[10px] text-ink/35 mt-0.5">{dataHoraFmt(n.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => excluirNota(n.id)}
                        className="text-[10px] text-rose hover:underline shrink-0"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 space-y-1.5">
                <textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  className="input text-xs"
                  rows={3}
                  placeholder="Ex: Cliente convertido no plano X"
                />
                <button
                  onClick={adicionarNota}
                  disabled={savingNota || !novaNota.trim()}
                  className="text-xs bg-accent text-white px-2 py-1 rounded-md disabled:opacity-50"
                >
                  {savingNota ? "Salvando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
