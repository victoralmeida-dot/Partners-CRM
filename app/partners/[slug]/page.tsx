"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/Badge";

type Comissao = {
  id: string;
  valor: number;
  tipo: string;
  statusPagamento: string;
};

type Indicacao = {
  id: string;
  leadNome: string;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
  faturamento: number | null;
  quemIndicou: string | null;
  origem: string;
  status: string;
  valorEstimado: number | null;
  observacoes: string | null;
  data: string;
  comissao: Comissao | null;
};

type Acao = {
  id: string;
  titulo: string;
  tipo: string;
  dataPlanejada: string;
  status: string;
  responsavel: string | null;
};

type CatalogoEvento = {
  id: string;
  nome: string;
  data: string;
};

type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  email: string | null;
  empresa: string | null;
  faturamento: number | null;
};

type EventoParticipacao = {
  id: string;
  eventoId: string;
  evento: CatalogoEvento;
  status: string;
  participacaoPalco: boolean;
  quemParticipou: string | null;
  participacaoPlateia: boolean;
  conteudoPalestra: string | null;
  mailingEnviado: boolean;
  mailingData: string | null;
  convidados: Convidado[];
};

type MetaParceiro = {
  id: string;
  tipo: string;
  periodo: string;
  valorMeta: number;
  fixa: boolean;
};

type OnboardingItem = {
  id: string;
  item: string;
  ordem: number;
  concluido: boolean;
  concluidoEm: string | null;
};

type Partner = {
  id: string;
  nome: string;
  tier: string;
  status: string;
  categoria: string | null;
  prioritario: boolean;
  mantenedor: boolean;
  cotaEventosContratados: number | null;
  icpFaturamentoMin: number | null;
  icpFaturamentoMax: number | null;
  icpPedidosMin: number | null;
  icpSegmento: string | null;
  icpCaracteristicas: string | null;
  contatoPrincipal: string | null;
  contatoEmail: string | null;
  contatoSecund: string | null;
  observacoes: string | null;
  indicacoes: Indicacao[];
  acoes: Acao[];
  eventos: EventoParticipacao[];
  metas: MetaParceiro[];
  onboarding: OnboardingItem[];
};

const dateFmt = (d: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(d));
const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// recebe só os dígitos (centavos) e formata pra exibição (1.234.567,89)
const formatarFaturamentoInput = (digits: string) => {
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [catalogoEventos, setCatalogoEventos] = useState<CatalogoEvento[]>([]);
  const [showIndicacaoForm, setShowIndicacaoForm] = useState(false);
  const [showAcaoForm, setShowAcaoForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [showMetaParceiroForm, setShowMetaParceiroForm] = useState(false);

  const load = () => fetch(`/api/partners/${slug}`).then((r) => r.json()).then(setPartner);
  const loadCatalogoEventos = () =>
    fetch("/api/eventos").then((r) => r.json()).then(setCatalogoEventos);

  useEffect(() => {
    load();
    loadCatalogoEventos();
  }, [slug]);

  if (!partner) return <p className="text-ink/50">Carregando...</p>;

  // Cota contratada conta só participações que de fato aconteceram — uma
  // participação PLANEJADA ou CANCELADA não deveria "gastar" a cota.
  const eventosRealizados = partner.eventos.filter((e) => e.status === "REALIZADO").length;

  const deletePartner = async () => {
    if (!confirm(`Remover ${partner.nome}? Isso também remove indicações e ações vinculadas.`)) return;
    await fetch(`/api/partners/${partner.id}`, { method: "DELETE" });
    router.push("/partners");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{partner.nome}</h1>
            {partner.mantenedor && <Badge value="MANTENEDOR" />}
            <Badge value={partner.tier} />
            <Badge value={partner.status} />
          </div>
          <p className="text-ink/50 text-sm mt-1">
            {partner.categoria ?? "Sem categoria"} · {partner.contatoPrincipal ?? "sem contato definido"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEditForm((v) => !v)}
            className="text-xs text-accent hover:underline"
          >
            {showEditForm ? "Cancelar edição" : "Editar partner"}
          </button>
          <button onClick={deletePartner} className="text-xs text-rose hover:underline">
            Remover partner
          </button>
        </div>
      </div>

      {showEditForm && (
        <EditPartnerForm
          partner={partner}
          onSaved={() => {
            setShowEditForm(false);
            load();
          }}
        />
      )}

      {(partner.icpFaturamentoMin != null ||
        partner.icpFaturamentoMax != null ||
        partner.icpPedidosMin != null ||
        partner.icpSegmento ||
        partner.icpCaracteristicas) && (
        <div className="bg-surface border border-accent/30 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-accent mb-2">
            ICP · Perfil de Cliente Ideal
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/80">
            {(partner.icpFaturamentoMin != null || partner.icpFaturamentoMax != null) && (
              <span>
                💰 Faturamento:{" "}
                {partner.icpFaturamentoMin != null ? currency(partner.icpFaturamentoMin) : "sem mínimo"}
                {" – "}
                {partner.icpFaturamentoMax != null ? currency(partner.icpFaturamentoMax) : "sem teto"}
              </span>
            )}
            {partner.icpPedidosMin != null && (
              <span>📦 A partir de {partner.icpPedidosMin.toLocaleString("pt-BR")} pedidos/mês</span>
            )}
            {partner.icpSegmento && <span>🏷️ Segmento: {partner.icpSegmento}</span>}
          </div>
          {partner.icpCaracteristicas && (
            <p className="text-sm text-ink/60 mt-2">{partner.icpCaracteristicas}</p>
          )}
        </div>
      )}

      {partner.observacoes && (
        <p className="text-sm text-ink/60 bg-surface border border-line rounded-lg p-4">
          {partner.observacoes}
        </p>
      )}

      {/* Onboarding */}
      <OnboardingSection partner={partner} onSaved={load} />

      {/* Indicações */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-ink">Indicações e comissões</h2>
          <button
            onClick={() => setShowIndicacaoForm((v) => !v)}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
          >
            {showIndicacaoForm ? "Cancelar" : "+ Indicação"}
          </button>
        </div>

        {showIndicacaoForm && (
          <IndicacaoForm partnerId={partner.id} onSaved={() => { setShowIndicacaoForm(false); load(); }} />
        )}

        {partner.indicacoes.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhuma indicação registrada ainda.</p>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-ink/40 text-xs uppercase">
                <th className="py-2">Lead</th>
                <th>Quem indicou</th>
                <th>Status</th>
                <th>Comissão</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partner.indicacoes.map((i) => (
                <IndicacaoRow key={i.id} indicacao={i} onSaved={load} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ações / cronograma */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-ink">Cronograma de ações</h2>
          <button
            onClick={() => setShowAcaoForm((v) => !v)}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
          >
            {showAcaoForm ? "Cancelar" : "+ Ação"}
          </button>
        </div>

        {showAcaoForm && (
          <AcaoForm partnerId={partner.id} onSaved={() => { setShowAcaoForm(false); load(); }} />
        )}

        {partner.acoes.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhuma ação planejada ainda.</p>
        ) : (
          <ul className="divide-y divide-line mt-2">
            {partner.acoes.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{a.titulo}</p>
                  <p className="text-ink/40 text-xs">
                    {a.tipo.replaceAll("_", " ")} · {a.responsavel ?? "sem responsável"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink/50 text-xs">{dateFmt(a.dataPlanejada)}</span>
                  <Badge value={a.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Eventos */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-ink">Participação em eventos</h2>
            {partner.cotaEventosContratados != null && (
              <p className="text-xs text-ink/40 mt-0.5">
                {eventosRealizados} / {partner.cotaEventosContratados} eventos da cota contratada
              </p>
            )}
          </div>
          <button
            onClick={() => setShowEventoForm((v) => !v)}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
          >
            {showEventoForm ? "Cancelar" : "+ Evento"}
          </button>
        </div>

        {partner.cotaEventosContratados != null && (
          <div className="w-full h-2 bg-line rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-accent"
              style={{
                width: `${Math.min(
                  100,
                  (eventosRealizados / partner.cotaEventosContratados) * 100
                )}%`,
              }}
            />
          </div>
        )}

        {showEventoForm && (
          <EventoForm
            partnerId={partner.id}
            catalogoEventos={catalogoEventos}
            onEventoCriado={loadCatalogoEventos}
            onSaved={() => { setShowEventoForm(false); load(); }}
          />
        )}

        {partner.eventos.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhum evento registrado ainda.</p>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-ink/40 text-xs uppercase">
                <th className="py-2">Evento</th>
                <th>Data</th>
                <th>Status</th>
                <th>Palco</th>
                <th>Plateia</th>
                <th>Mailing</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partner.eventos.map((ev) => (
                <EventoRow
                  key={ev.id}
                  evento={ev}
                  catalogoEventos={catalogoEventos}
                  onEventoCriado={loadCatalogoEventos}
                  onSaved={load}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Metas do parceiro */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-ink">Metas do parceiro</h2>
          <button
            onClick={() => setShowMetaParceiroForm((v) => !v)}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
          >
            {showMetaParceiroForm ? "Cancelar" : "+ Meta"}
          </button>
        </div>

        {showMetaParceiroForm && (
          <MetaParceiroForm
            partnerId={partner.id}
            onSaved={() => {
              setShowMetaParceiroForm(false);
              load();
            }}
          />
        )}

        <MetasParceiroPainel metas={partner.metas} indicacoes={partner.indicacoes} acoes={partner.acoes} onSaved={load} />
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

function IndicacaoForm({ partnerId, onSaved }: { partnerId: string; onSaved: () => void }) {
  const [leadNome, setLeadNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [quemIndicou, setQuemIndicou] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [consultores, setConsultores] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    fetch("/api/consultores")
      .then((r) => r.json())
      .then(setConsultores);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/indicacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        leadNome,
        telefone,
        email,
        cnpj,
        faturamento: faturamento ? Number(faturamento) / 100 : null,
        quemIndicou,
        observacoes,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 mb-4 bg-paper p-4 rounded-md">
      <input
        required
        placeholder="Nome do mentorado"
        value={leadNome}
        onChange={(e) => setLeadNome(e.target.value)}
        className="input"
      />
      <input
        placeholder="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        className="input"
      />
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />
      <input
        placeholder="CNPJ"
        value={cnpj}
        onChange={(e) => setCnpj(e.target.value)}
        className="input"
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Faturamento (R$)"
        value={formatarFaturamentoInput(faturamento)}
        onChange={(e) => setFaturamento(e.target.value.replace(/\D/g, ""))}
        className="input"
      />
      <select
        value={quemIndicou}
        onChange={(e) => setQuemIndicou(e.target.value)}
        className="input"
      >
        <option value="">Quem indicou...</option>
        {consultores.map((c) => (
          <option key={c.id} value={c.nome}>
            {c.nome}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Contexto da necessidade (qual dor motivou a indicação)"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        className="input md:col-span-4"
        rows={2}
      />
      <button disabled={saving} className="bg-accent text-white text-sm rounded-md px-3 py-2 md:col-span-4 w-fit disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

function IndicacaoRow({ indicacao, onSaved }: { indicacao: Indicacao; onSaved: () => void }) {
  const [editingComissao, setEditingComissao] = useState(false);
  const [valor, setValor] = useState(indicacao.comissao?.valor?.toString() ?? "");
  const [tipo, setTipo] = useState(indicacao.comissao?.tipo ?? "PERCENTUAL");
  const [statusPagamento, setStatusPagamento] = useState(
    indicacao.comissao?.statusPagamento ?? "PENDENTE"
  );

  const updateStatus = async (status: string) => {
    await fetch(`/api/indicacoes/${indicacao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onSaved();
  };

  const saveComissao = async () => {
    await fetch(`/api/indicacoes/${indicacao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comissao: { valor: Number(valor), tipo, statusPagamento } }),
    });
    setEditingComissao(false);
    onSaved();
  };

  const removerComissao = async () => {
    if (!confirm(`Remover a comissão de "${indicacao.leadNome}"? Essa indicação volta a não ter comissão definida.`)) return;
    await fetch(`/api/indicacoes/${indicacao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removerComissao: true }),
    });
    setEditingComissao(false);
    onSaved();
  };

  return (
    <tr>
      <td className="py-2">{indicacao.leadNome}</td>
      <td className="text-xs text-ink/60">{indicacao.quemIndicou || "—"}</td>
      <td>
        <select
          value={indicacao.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="text-xs border border-line rounded-md px-1 py-0.5"
        >
          <option value="LEAD_POTENCIAL">Lead Potencial</option>
          <option value="ENVIADA">Enviada</option>
          <option value="NEGOCIACAO">Negociação</option>
          <option value="EM_ESPERA">Em espera / Revisitar</option>
          <option value="CONVERTIDA">Convertida</option>
          <option value="PERDIDA">Perdida</option>
        </select>
      </td>
      <td>
        {editingComissao ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-20 text-xs border border-line rounded-md px-1 py-0.5"
              placeholder="valor"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="text-xs border border-line rounded-md px-1 py-0.5"
            >
              <option value="PERCENTUAL">%</option>
              <option value="FIXO">R$</option>
            </select>
            <select
              value={statusPagamento}
              onChange={(e) => setStatusPagamento(e.target.value)}
              className="text-xs border border-line rounded-md px-1 py-0.5"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
            </select>
            <button onClick={saveComissao} className="text-xs text-accent">
              salvar
            </button>
            {indicacao.comissao && (
              <button onClick={removerComissao} className="text-xs text-rose hover:underline">
                remover
              </button>
            )}
            <button
              onClick={() => setEditingComissao(false)}
              className="text-xs text-ink/40 hover:underline"
            >
              cancelar
            </button>
          </div>
        ) : indicacao.comissao ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setEditingComissao(true)} className="flex items-center gap-1">
              <span className="text-xs">
                {indicacao.comissao.tipo === "PERCENTUAL"
                  ? `${indicacao.comissao.valor}%`
                  : currency(indicacao.comissao.valor)}
              </span>
              <Badge value={indicacao.comissao.statusPagamento} />
            </button>
            <button
              onClick={removerComissao}
              className="text-ink/30 hover:text-rose transition-colors"
              title="Remover comissão"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingComissao(true)} className="text-xs text-accent hover:underline">
            + definir comissão
          </button>
        )}
      </td>
      <td className="text-ink/50 text-xs">{dateFmt(indicacao.data)}</td>
    </tr>
  );
}

function AcaoForm({ partnerId, onSaved }: { partnerId: string; onSaved: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("FOLLOW_UP");
  const [dataPlanejada, setDataPlanejada] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/acoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, titulo, tipo, dataPlanejada, responsavel }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mb-4 bg-paper p-4 rounded-md">
      <input
        required
        placeholder="Título da ação"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="input md:col-span-2"
      />
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
        <option value="REUNIAO">Reunião</option>
        <option value="EVENTO">Evento</option>
        <option value="ATIVACAO">Ativação</option>
        <option value="FOLLOW_UP">Follow-up</option>
        <option value="OUTRO">Outro</option>
      </select>
      <input
        required
        type="date"
        value={dataPlanejada}
        onChange={(e) => setDataPlanejada(e.target.value)}
        className="input"
      />
      <input
        placeholder="Responsável"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        className="input"
      />
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 py-2 md:col-span-5 w-fit disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar ação"}
      </button>
    </form>
  );
}

function EditPartnerForm({ partner, onSaved }: { partner: Partner; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: partner.nome,
    tier: partner.tier,
    status: partner.status,
    categoria: partner.categoria ?? "",
    prioritario: partner.prioritario,
    mantenedor: partner.mantenedor,
    cotaEventosContratados: partner.cotaEventosContratados?.toString() ?? "",
    icpFaturamentoMin: partner.icpFaturamentoMin?.toString() ?? "",
    icpFaturamentoMax: partner.icpFaturamentoMax?.toString() ?? "",
    icpPedidosMin: partner.icpPedidosMin?.toString() ?? "",
    icpSegmento: partner.icpSegmento ?? "",
    icpCaracteristicas: partner.icpCaracteristicas ?? "",
    contatoPrincipal: partner.contatoPrincipal ?? "",
    contatoEmail: partner.contatoEmail ?? "",
    contatoSecund: partner.contatoSecund ?? "",
    observacoes: partner.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    fetch("/api/tiers")
      .then((r) => r.json())
      .then(setTiers);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/partners/${partner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cotaEventosContratados: form.cotaEventosContratados
          ? Number(form.cotaEventosContratados)
          : null,
        icpFaturamentoMin: form.icpFaturamentoMin ? Number(form.icpFaturamentoMin) : null,
        icpFaturamentoMax: form.icpFaturamentoMax ? Number(form.icpFaturamentoMax) : null,
        icpPedidosMin: form.icpPedidosMin ? Number(form.icpPedidosMin) : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-line rounded-lg p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Nome</span>
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Categoria</span>
          <input
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Tier</span>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            className="input"
          >
            {tiers.map((t) => (
              <option key={t.id} value={t.nome.toUpperCase()}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input"
          >
            <option value="ATIVO">Ativo</option>
            <option value="EM_ATIVACAO">Em ativação</option>
            <option value="PAUSADO">Pausado</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Contato principal</span>
          <input
            value={form.contatoPrincipal}
            onChange={(e) => setForm({ ...form, contatoPrincipal: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">E-mail do contato</span>
          <input
            type="email"
            value={form.contatoEmail}
            onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Contato secundário</span>
          <input
            value={form.contatoSecund}
            onChange={(e) => setForm({ ...form, contatoSecund: e.target.value })}
            className="input"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-ink/50 mb-1 block">Observações</span>
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          className="input"
          rows={3}
        />
      </label>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.prioritario}
            onChange={(e) => setForm({ ...form, prioritario: e.target.checked })}
          />
          Acompanhamento próximo (prioritário)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.mantenedor}
            onChange={(e) => setForm({ ...form, mantenedor: e.target.checked })}
          />
          Mantenedor
        </label>
      </div>

      <label className="block max-w-xs">
        <span className="text-xs text-ink/50 mb-1 block">
          Cota de eventos contratados (opcional)
        </span>
        <input
          type="number"
          min="0"
          value={form.cotaEventosContratados}
          onChange={(e) => setForm({ ...form, cotaEventosContratados: e.target.value })}
          className="input"
          placeholder="Ex: 18"
        />
      </label>

      <div className="border-t border-line pt-4">
        <p className="text-xs uppercase tracking-wide text-accent mb-3">
          ICP · Perfil de Cliente Ideal
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-ink/50 mb-1 block">Faturamento mínimo (R$)</span>
            <input
              type="number"
              min="0"
              value={form.icpFaturamentoMin}
              onChange={(e) => setForm({ ...form, icpFaturamentoMin: e.target.value })}
              className="input"
              placeholder="Ex: 100000"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink/50 mb-1 block">Faturamento máximo (R$)</span>
            <input
              type="number"
              min="0"
              value={form.icpFaturamentoMax}
              onChange={(e) => setForm({ ...form, icpFaturamentoMax: e.target.value })}
              className="input"
              placeholder="Deixe em branco se não houver teto"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink/50 mb-1 block">Pedidos mínimos/mês</span>
            <input
              type="number"
              min="0"
              value={form.icpPedidosMin}
              onChange={(e) => setForm({ ...form, icpPedidosMin: e.target.value })}
              className="input"
              placeholder="Ex: 1000"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-ink/50 mb-1 block">Segmento</span>
            <input
              value={form.icpSegmento}
              onChange={(e) => setForm({ ...form, icpSegmento: e.target.value })}
              className="input"
              placeholder="Ex: Marca própria, Importação..."
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-ink/50 mb-1 block">Outras características</span>
            <textarea
              value={form.icpCaracteristicas}
              onChange={(e) => setForm({ ...form, icpCaracteristicas: e.target.value })}
              className="input"
              rows={2}
              placeholder="Ex: Não usa WMS ainda; alto volume de pedidos"
            />
          </label>
        </div>
      </div>

      <button
        disabled={saving}
        className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function EventoSelect({
  catalogoEventos,
  value,
  onChange,
  onEventoCriado,
}: {
  catalogoEventos: CatalogoEvento[];
  value: string;
  onChange: (eventoId: string) => void;
  onEventoCriado: () => void;
}) {
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoData, setNovoData] = useState("");
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    if (!novoNome || !novoData) return;
    setSaving(true);
    const res = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, data: novoData }),
    });
    const criado = await res.json();
    setSaving(false);
    setCriandoNovo(false);
    setNovoNome("");
    setNovoData("");
    onEventoCriado();
    onChange(criado.id);
  };

  if (criandoNovo) {
    return (
      <div className="md:col-span-2 flex flex-col gap-2 bg-surface border border-line rounded-md p-2">
        <p className="text-xs text-ink/50">Novo evento no catálogo</p>
        <input
          placeholder="Nome do evento"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          className="input"
        />
        <input
          type="date"
          value={novoData}
          onChange={(e) => setNovoData(e.target.value)}
          className="input"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={criar}
            disabled={saving || !novoNome || !novoData}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {saving ? "Criando..." : "Criar e selecionar"}
          </button>
          <button
            type="button"
            onClick={() => setCriandoNovo(false)}
            className="text-xs text-ink/50 hover:underline"
          >
            cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <select
      required
      value={value}
      onChange={(e) => (e.target.value === "__novo__" ? setCriandoNovo(true) : onChange(e.target.value))}
      className="input md:col-span-2"
    >
      <option value="">Selecione o evento...</option>
      {catalogoEventos.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.nome} — {dateFmt(ev.data)}
        </option>
      ))}
      <option value="__novo__">+ Criar novo evento</option>
    </select>
  );
}

function EventoForm({
  partnerId,
  catalogoEventos,
  onEventoCriado,
  onSaved,
}: {
  partnerId: string;
  catalogoEventos: CatalogoEvento[];
  onEventoCriado: () => void;
  onSaved: () => void;
}) {
  const [eventoId, setEventoId] = useState("");
  const [status, setStatus] = useState("PLANEJADO");
  const [participacaoPalco, setParticipacaoPalco] = useState(false);
  const [quemParticipou, setQuemParticipou] = useState("");
  const [participacaoPlateia, setParticipacaoPlateia] = useState(false);
  const [conteudoPalestra, setConteudoPalestra] = useState("");
  const [mailingEnviado, setMailingEnviado] = useState(false);
  const [saving, setSaving] = useState(false);

  const jaAconteceu = status !== "PLANEJADO";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventoId) return;
    setSaving(true);
    await fetch("/api/participacoes-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        eventoId,
        status,
        participacaoPalco: jaAconteceu ? participacaoPalco : false,
        quemParticipou: jaAconteceu && participacaoPalco ? quemParticipou : null,
        participacaoPlateia: jaAconteceu ? participacaoPlateia : false,
        conteudoPalestra: jaAconteceu ? conteudoPalestra : null,
        mailingEnviado: jaAconteceu ? mailingEnviado : false,
        mailingData: jaAconteceu && mailingEnviado ? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mb-4 bg-paper p-4 rounded-md">
      <EventoSelect
        catalogoEventos={catalogoEventos}
        value={eventoId}
        onChange={setEventoId}
        onEventoCriado={onEventoCriado}
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
        <option value="PLANEJADO">Planejado</option>
        <option value="REALIZADO">Realizado</option>
        <option value="CANCELADO">Cancelado</option>
      </select>
      {jaAconteceu && (
        <>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={participacaoPalco}
              onChange={(e) => setParticipacaoPalco(e.target.checked)}
            />
            Participação no palco
          </label>
          {participacaoPalco && (
            <input
              placeholder="Quem participou"
              value={quemParticipou}
              onChange={(e) => setQuemParticipou(e.target.value)}
              className="input md:col-span-2"
            />
          )}
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={participacaoPlateia}
              onChange={(e) => setParticipacaoPlateia(e.target.checked)}
            />
            Convidados na plateia
          </label>
          <textarea
            placeholder="Conteúdo da palestra"
            value={conteudoPalestra}
            onChange={(e) => setConteudoPalestra(e.target.value)}
            className="input md:col-span-5"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={mailingEnviado}
              onChange={(e) => setMailingEnviado(e.target.checked)}
            />
            Mailing enviado
          </label>
        </>
      )}
      <button
        disabled={saving || !eventoId}
        className="bg-accent text-white text-sm rounded-md px-3 py-2 md:col-span-5 w-fit disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar participação"}
      </button>
    </form>
  );
}

function EventoRow({
  evento,
  catalogoEventos,
  onEventoCriado,
  onSaved,
}: {
  evento: EventoParticipacao;
  catalogoEventos: CatalogoEvento[];
  onEventoCriado: () => void;
  onSaved: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [expandidoConvidados, setExpandidoConvidados] = useState(false);

  const toggleMailing = async () => {
    await fetch(`/api/participacoes-evento/${evento.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mailingEnviado: !evento.mailingEnviado,
        mailingData: !evento.mailingEnviado ? new Date().toISOString() : null,
      }),
    });
    onSaved();
  };

  const excluir = async () => {
    setExcluindo(true);
    await fetch(`/api/participacoes-evento/${evento.id}`, { method: "DELETE" });
    onSaved();
  };

  if (editando) {
    return (
      <EventoEditRow
        evento={evento}
        catalogoEventos={catalogoEventos}
        onEventoCriado={onEventoCriado}
        onSaved={() => {
          setEditando(false);
          onSaved();
        }}
        onCancel={() => setEditando(false)}
      />
    );
  }

  return (
    <Fragment>
    <tr>
      <td className="py-2">{evento.evento.nome}</td>
      <td className="text-ink/50 text-xs">{dateFmt(evento.evento.data)}</td>
      <td className="text-xs">
        <div className="flex flex-col gap-1">
          <Badge value={evento.status} />
          {evento.status === "PLANEJADO" && new Date(evento.evento.data) < new Date() && (
            <span className="text-amber text-[11px]">⚠️ data já passou — atualizar status?</span>
          )}
        </div>
      </td>
      <td className="text-xs">
        {evento.participacaoPalco ? `Sim — ${evento.quemParticipou ?? ""}` : "Não"}
      </td>
      <td className="text-xs">
        {evento.participacaoPlateia ? (
          <button
            onClick={() => setExpandidoConvidados((v) => !v)}
            className="text-accent hover:underline"
          >
            Sim{evento.convidados.length > 0 ? ` (${evento.convidados.length})` : ""}{" "}
            {expandidoConvidados ? "▲" : "▼"}
          </button>
        ) : (
          "Não"
        )}
      </td>
      <td>
        <button
          onClick={toggleMailing}
          className={`text-xs px-2 py-0.5 rounded-full border ${
            evento.mailingEnviado
              ? "bg-accent/10 text-accent border-accent/30"
              : "bg-ink/5 text-ink/50 border-ink/15"
          }`}
        >
          {evento.mailingEnviado ? "Enviado" : "Marcar enviado"}
        </button>
      </td>
      <td className="text-right whitespace-nowrap">
        {excluindo ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-ink/50">Excluir "{evento.evento.nome}"?</span>
            <button
              onClick={excluir}
              className="text-xs bg-rose text-white px-2 py-1 rounded-md hover:bg-rose/90"
            >
              Confirmar
            </button>
            <button
              onClick={() => setExcluindo(false)}
              className="text-xs text-ink/50 hover:underline"
            >
              cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditando(true)}
              className="text-ink/40 hover:text-accent transition-colors p-1"
              title="Editar participação"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" strokeLinecap="round" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setExcluindo(true)}
              className="text-rose/70 hover:text-rose transition-colors p-1"
              title="Excluir participação"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </td>
    </tr>
    {expandidoConvidados && evento.participacaoPlateia && (
      <tr className="bg-paper">
        <td colSpan={7} className="py-3">
          <ConvidadosEvento
            participacaoEventoId={evento.id}
            convidados={evento.convidados}
            onSaved={onSaved}
          />
        </td>
      </tr>
    )}
    </Fragment>
  );
}

function ConvidadosEvento({
  participacaoEventoId,
  convidados,
  onSaved,
}: {
  participacaoEventoId: string;
  convidados: Convidado[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [saving, setSaving] = useState(false);

  const adicionar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await fetch("/api/convidados-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participacaoEventoId,
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        empresa: empresa.trim() || null,
        faturamento: faturamento ? Number(faturamento) : null,
      }),
    });
    setNome("");
    setTelefone("");
    setCpf("");
    setEmail("");
    setEmpresa("");
    setFaturamento("");
    setSaving(false);
    onSaved();
  };

  const remover = async (id: string) => {
    await fetch(`/api/convidados-evento/${id}`, { method: "DELETE" });
    onSaved();
  };

  return (
    <div className="space-y-2">
      <span className="text-xs text-ink/50">Convidados trazidos pelo parceiro</span>

      {convidados.length > 0 && (
        <ul className="space-y-1.5">
          {convidados.map((c) => (
            <li
              key={c.id}
              className="bg-surface border border-line rounded-md p-2 flex items-start justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {c.nome}
                  {c.empresa ? ` — ${c.empresa}` : ""}
                </p>
                <p className="text-ink/50">
                  {c.telefone || "sem telefone"} · {c.cpf || "sem CPF"} · {c.email || "sem e-mail"}
                  {c.faturamento != null ? ` · ${currency(c.faturamento)}` : ""}
                </p>
              </div>
              <button
                onClick={() => remover(c.id)}
                className="text-rose hover:underline shrink-0"
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid md:grid-cols-3 gap-2">
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="input text-xs"
        />
        <input
          placeholder="Empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="input text-xs"
        />
        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="input text-xs"
        />
        <input
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="input text-xs"
        />
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input text-xs"
        />
        <input
          type="number"
          min="0"
          placeholder="Faturamento"
          value={faturamento}
          onChange={(e) => setFaturamento(e.target.value)}
          className="input text-xs"
        />
      </div>
      <button
        onClick={adicionar}
        disabled={saving || !nome.trim()}
        className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
      >
        {saving ? "Adicionando..." : "Adicionar convidado"}
      </button>
    </div>
  );
}

function EventoEditRow({
  evento,
  catalogoEventos,
  onEventoCriado,
  onSaved,
  onCancel,
}: {
  evento: EventoParticipacao;
  catalogoEventos: CatalogoEvento[];
  onEventoCriado: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [eventoId, setEventoId] = useState(evento.eventoId);
  const [status, setStatus] = useState(evento.status);
  const [participacaoPalco, setParticipacaoPalco] = useState(evento.participacaoPalco);
  const [quemParticipou, setQuemParticipou] = useState(evento.quemParticipou ?? "");
  const [participacaoPlateia, setParticipacaoPlateia] = useState(evento.participacaoPlateia);
  const [conteudoPalestra, setConteudoPalestra] = useState(evento.conteudoPalestra ?? "");
  const [mailingEnviado, setMailingEnviado] = useState(evento.mailingEnviado);
  const [saving, setSaving] = useState(false);

  const jaAconteceu = status !== "PLANEJADO";

  const salvar = async () => {
    setSaving(true);
    await fetch(`/api/participacoes-evento/${evento.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventoId,
        status,
        participacaoPalco: jaAconteceu ? participacaoPalco : false,
        quemParticipou: jaAconteceu && participacaoPalco ? quemParticipou : null,
        participacaoPlateia: jaAconteceu ? participacaoPlateia : false,
        conteudoPalestra: jaAconteceu ? conteudoPalestra : null,
        mailingEnviado: jaAconteceu ? mailingEnviado : false,
        mailingData: jaAconteceu && mailingEnviado ? evento.mailingData ?? new Date().toISOString() : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <tr className="bg-paper">
      <td className="py-2" colSpan={7}>
        <div className="grid md:grid-cols-6 gap-2 items-center">
          <EventoSelect
            catalogoEventos={catalogoEventos}
            value={eventoId}
            onChange={setEventoId}
            onEventoCriado={onEventoCriado}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="PLANEJADO">Planejado</option>
            <option value="REALIZADO">Realizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          {jaAconteceu && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={participacaoPalco}
                  onChange={(e) => setParticipacaoPalco(e.target.checked)}
                />
                Palco
              </label>
              {participacaoPalco && (
                <input
                  value={quemParticipou}
                  onChange={(e) => setQuemParticipou(e.target.value)}
                  className="input"
                  placeholder="Quem participou"
                />
              )}
              <label className="flex items-center gap-1.5 text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={participacaoPlateia}
                  onChange={(e) => setParticipacaoPlateia(e.target.checked)}
                />
                Plateia
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={mailingEnviado}
                  onChange={(e) => setMailingEnviado(e.target.checked)}
                />
                Mailing enviado
              </label>
              <textarea
                value={conteudoPalestra}
                onChange={(e) => setConteudoPalestra(e.target.value)}
                className="input md:col-span-6"
                placeholder="Conteúdo da palestra"
                rows={2}
              />
            </>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={salvar}
              disabled={saving || !eventoId}
              className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={onCancel} className="text-xs text-ink/50 hover:underline">
              cancelar
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

const TIPOS_META_PARCEIRO = [
  { value: "LEADS_QUALIFICADOS", label: "Indicações" },
  { value: "REUNIOES_COMERCIAIS", label: "Reuniões comerciais" }, // legado — não é mais possível criar, só exibir
];

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function MetaParceiroForm({ partnerId, onSaved }: { partnerId: string; onSaved: () => void }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [valorMeta, setValorMeta] = useState("");
  const [fixa, setFixa] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/metas-parceiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        tipo: "LEADS_QUALIFICADOS",
        periodo: `${ano}-${String(mes).padStart(2, "0")}`,
        valorMeta: Number(valorMeta),
        fixa,
      }),
    });
    setSaving(false);
    setValorMeta("");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-3 mb-4 bg-paper p-4 rounded-md items-center">
      {!fixa && (
        <>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="input">
            {MESES_LABEL.map((label, idx) => (
              <option key={idx} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="input"
            placeholder="Ano"
          />
        </>
      )}
      <input
        required
        type="number"
        min="0"
        placeholder="Meta de indicações"
        value={valorMeta}
        onChange={(e) => setValorMeta(e.target.value)}
        className="input"
      />
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" checked={fixa} onChange={(e) => setFixa(e.target.checked)} />
        Meta fixa (contratual — vale todo mês)
      </label>
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar meta"}
      </button>
    </form>
  );
}

function MetasParceiroPainel({
  metas,
  indicacoes,
  acoes,
  onSaved,
}: {
  metas: MetaParceiro[];
  indicacoes: Indicacao[];
  acoes: Acao[];
  onSaved: () => void;
}) {
  const remover = async (id: string) => {
    await fetch(`/api/metas-parceiro/${id}`, { method: "DELETE" });
    onSaved();
  };

  if (metas.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        Nenhuma meta configurada ainda pra esse parceiro. Indicações e reuniões
        comerciais são contadas automaticamente a partir das indicações e ações já
        registradas — só falta definir o alvo (fixo ou de um mês específico).
      </p>
    );
  }

  const periodoAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  // Meta fixa (contratual) sempre mede o mês atual, não o período em que foi criada.
  const periodoParaCalculo = (m: MetaParceiro) => (m.fixa ? periodoAtual : m.periodo);

  const atingido = (m: MetaParceiro) => {
    const periodo = periodoParaCalculo(m);
    if (m.tipo === "LEADS_QUALIFICADOS") {
      return indicacoes.filter((i) => i.data.slice(0, 7) === periodo).length;
    }
    if (m.tipo === "REUNIOES_COMERCIAIS") {
      return acoes.filter(
        (a) => a.tipo === "REUNIAO" && a.status === "CONCLUIDA" && a.dataPlanejada.slice(0, 7) === periodo
      ).length;
    }
    return 0;
  };

  const labelPeriodo = (periodo: string) => {
    const [ano, mes] = periodo.split("-");
    return `${MESES_LABEL[Number(mes) - 1]}/${ano}`;
  };

  const labelTipo = (tipo: string) =>
    TIPOS_META_PARCEIRO.find((t) => t.value === tipo)?.label ?? tipo;

  return (
    <div className="space-y-3">
      {metas.map((m) => {
        const realizado = atingido(m);
        const pct = Math.min(100, (realizado / m.valorMeta) * 100);
        const bateu = realizado >= m.valorMeta;
        return (
          <div key={m.id} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-ink">
                {labelTipo(m.tipo)} —{" "}
                {m.fixa ? `fixa (contratual) · ${labelPeriodo(periodoAtual)}` : labelPeriodo(m.periodo)}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${bateu ? "text-accent" : "text-ink/50"}`}>
                  {realizado}/{m.valorMeta}
                </span>
                <button onClick={() => remover(m.id)} className="text-xs text-rose hover:underline">
                  remover
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className={`h-full ${bateu ? "bg-accent" : "bg-amber"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OnboardingSection({ partner, onSaved }: { partner: Partner; onSaved: () => void }) {
  const [novoItem, setNovoItem] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const itens = partner.onboarding;
  const concluidos = itens.filter((i) => i.concluido).length;
  const total = itens.length;
  const pct = total > 0 ? (concluidos / total) * 100 : 0;

  const toggle = async (item: OnboardingItem) => {
    await fetch(`/api/onboarding/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: !item.concluido }),
    });
    onSaved();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esse item da checklist de onboarding?")) return;
    await fetch(`/api/onboarding/${id}`, { method: "DELETE" });
    onSaved();
  };

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    if (!novoItem.trim()) return;
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: partner.id, item: novoItem }),
    });
    setSaving(false);
    setNovoItem("");
    setMostrarForm(false);
    onSaved();
  };

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-medium text-ink">Onboarding</h2>
          {total > 0 && (
            <p className="text-xs text-ink/40 mt-0.5">
              {concluidos}/{total} concluído{concluidos !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md"
        >
          {mostrarForm ? "Cancelar" : "+ Item"}
        </button>
      </div>

      {total > 0 && (
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mb-4">
          <div
            className={`h-full ${pct === 100 ? "bg-accent" : "bg-amber"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={adicionar} className="flex items-center gap-2 mb-4">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            className="input"
            placeholder="Descreva o item da checklist"
          />
          <button
            disabled={saving}
            className="text-xs bg-accent text-white px-3 py-2 rounded-md disabled:opacity-50 shrink-0"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-ink/40">Nenhum item de onboarding cadastrado ainda.</p>
      ) : (
        <ul className="divide-y divide-line">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={() => toggle(item)}
                  className="shrink-0"
                />
                <span className={item.concluido ? "text-ink/40 line-through" : "text-ink"}>
                  {item.item}
                </span>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                {item.concluido && item.concluidoEm && (
                  <span className="text-xs text-ink/30">{dateFmt(item.concluidoEm)}</span>
                )}
                <button
                  onClick={() => remover(item.id)}
                  className="text-ink/30 hover:text-rose transition-colors"
                  title="Remover item"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" strokeLinecap="round" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
