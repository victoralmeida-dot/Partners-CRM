"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import Badge from "@/components/Badge";

type Indicacao = { id: string; leadNome: string; status: string; data: string };
type Comissao = {
  id: string;
  leadNome: string;
  valor: number;
  tipo: string;
  statusPagamento: string;
};
type Convidado = {
  id: string;
  nome: string;
  status: string;
  motivoRejeicao: string | null;
};
type EventoParticipacao = {
  id: string;
  nome: string;
  data: string;
  status: string;
  participacaoPalco: boolean;
  convidados: Convidado[];
};
type Meta = {
  valorMeta: number;
  realizado: number;
  pct: number;
  projecaoFimMes: number;
  pctProjecao: number;
  vaiBaterMeta: boolean;
};
type MeusDados = {
  partner: { nome: string };
  indicacoes: Indicacao[];
  comissoes: Comissao[];
  eventos: EventoParticipacao[];
  meta: Meta | null;
};

const STATUS_INDICACAO = [
  { key: "LEAD_POTENCIAL", label: "Lead Potencial" },
  { key: "ENVIADA", label: "Enviada" },
  { key: "NEGOCIACAO", label: "Negociação" },
  { key: "EM_ESPERA", label: "Em espera / Revisitar" },
  { key: "CONVERTIDA", label: "Convertida" },
  { key: "PERDIDA", label: "Perdida" },
];

const STATUS_ABERTOS = ["LEAD_POTENCIAL", "ENVIADA", "NEGOCIACAO", "EM_ESPERA"];

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// timeZone: "UTC" — Indicacao.data e Evento.data são datas "puras" (meia-noite
// UTC), então formatar sem fixar UTC faz o dia exibido voltar um pra trás no
// fuso do Brasil (ver CLAUDE.md/decisoes.md sobre esse padrão).
const dateFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(d));

export default function PortalParceiroPage() {
  const [dados, setDados] = useState<MeusDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showIndicacoes, setShowIndicacoes] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");

  const load = () =>
    fetch("/api/portal/meus-dados")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error ?? "Não foi possível carregar seus dados.");
        }
        return r.json();
      })
      .then(setDados)
      .catch((e) => setErro(e.message));

  useEffect(() => {
    load();
  }, []);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-paper">
        <p className="text-sm text-rose">{erro}</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-paper">
        <p className="text-sm text-ink/40">Carregando...</p>
      </div>
    );
  }

  const bateuMeta = dados.meta ? dados.meta.pct >= 100 : false;
  const convites = dados.eventos.filter((e) => e.status === "CONVITE_ENVIADO");
  const confirmados = dados.eventos.filter((e) => e.status === "PLANEJADO" || e.status === "REALIZADO");
  const indicacoesEmAberto = dados.indicacoes.filter((i) => STATUS_ABERTOS.includes(i.status)).length;
  const indicacoesFiltradas = filtroStatus
    ? dados.indicacoes.filter((i) => i.status === filtroStatus)
    : dados.indicacoes;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink/40">Portal do Parceiro</p>
            <h1 className="text-lg font-semibold text-ink">{dados.partner.nome}</h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-accent hover:underline"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {dados.meta && (
          <section className="bg-surface border border-line rounded-lg p-5">
            <h2 className="text-sm font-medium text-ink mb-3">Meta de indicações do mês</h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink/70">
                {dados.meta.realizado} de {dados.meta.valorMeta}
              </span>
              <span className={`font-medium ${bateuMeta ? "text-[rgb(var(--c-success))]" : "text-amber"}`}>
                {dados.meta.pct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-line rounded-full overflow-hidden">
              <div
                className={`h-full ${bateuMeta ? "bg-[rgb(var(--c-success))]" : "bg-amber"}`}
                style={{ width: `${Math.min(100, dados.meta.pct)}%` }}
              />
            </div>
            {!bateuMeta && (
              <p
                className={`text-xs mt-2 ${dados.meta.vaiBaterMeta ? "text-accent" : "text-rose"}`}
              >
                {dados.meta.vaiBaterMeta ? "📈" : "📉"} No ritmo atual, projeção é fechar o mês em{" "}
                {dados.meta.pctProjecao.toFixed(0)}% da meta
              </p>
            )}
          </section>
        )}

        <section className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-ink">Indicações</h2>
              <p className="text-xs text-ink/40 mt-0.5">
                {dados.indicacoes.length} no total · {indicacoesEmAberto} em aberto
              </p>
            </div>
            <button
              onClick={() => setShowIndicacoes((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {showIndicacoes ? "Ver menos ▲" : "Ver indicações ▼"}
            </button>
          </div>

          {showIndicacoes &&
            (dados.indicacoes.length === 0 ? (
              <p className="text-sm text-ink/40 mt-3">Nenhuma indicação registrada ainda.</p>
            ) : (
              <div className="mt-3">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="input text-xs w-auto mb-2"
                >
                  <option value="">Todos os status</option>
                  {STATUS_INDICACAO.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {indicacoesFiltradas.length === 0 ? (
                  <p className="text-sm text-ink/40">Nenhuma indicação com esse status.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink/40 text-xs uppercase">
                        <th className="py-2 font-normal">Cliente</th>
                        <th className="font-normal">Status</th>
                        <th className="font-normal">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {indicacoesFiltradas.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 text-ink">{i.leadNome}</td>
                          <td>
                            <Badge value={i.status} />
                          </td>
                          <td className="text-ink/60">{dateFmt(i.data)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
        </section>

        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-sm font-medium text-ink mb-3">Suas comissões</h2>
          {dados.comissoes.length === 0 ? (
            <p className="text-sm text-ink/40">Nenhuma comissão registrada ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/40 text-xs uppercase">
                  <th className="py-2 font-normal">Cliente</th>
                  <th className="font-normal">Valor</th>
                  <th className="font-normal">Tipo</th>
                  <th className="font-normal">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dados.comissoes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 text-ink">{c.leadNome}</td>
                    <td className="text-ink/70">
                      {c.tipo === "PERCENTUAL" ? `${c.valor}%` : currency(c.valor)}
                    </td>
                    <td className="text-ink/60">{c.tipo === "PERCENTUAL" ? "Percentual" : "Fixo"}</td>
                    <td>
                      <Badge value={c.statusPagamento} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-sm font-medium text-ink mb-3">Meus eventos</h2>
          {convites.length === 0 && confirmados.length === 0 ? (
            <p className="text-sm text-ink/40">Nenhum evento ainda.</p>
          ) : (
            <div className="space-y-3">
              {convites.map((e) => (
                <EventoConviteCard key={e.id} evento={e} onSaved={load} />
              ))}
              {confirmados.map((e) => (
                <EventoConfirmadoCard key={e.id} evento={e} onSaved={load} />
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-ink/30 text-center">Ambiente local · dados não expostos</p>
      </main>
    </div>
  );
}

function EventoConviteCard({ evento, onSaved }: { evento: EventoParticipacao; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);

  const responder = async (acao: "aceitar" | "recusar") => {
    setSaving(true);
    await fetch(`/api/portal/eventos/${evento.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-amber/5 border border-amber/20 rounded-md p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{evento.nome}</p>
          <p className="text-xs text-ink/50">{dateFmt(evento.data)}</p>
        </div>
        <Badge value={evento.status} />
      </div>
      <p className="text-xs text-ink/60 mt-2">Você foi convidado(a) pra participar deste evento.</p>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => responder("aceitar")}
          disabled={saving}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          Aceitar
        </button>
        <button
          onClick={() => responder("recusar")}
          disabled={saving}
          className="text-xs border border-rose text-rose px-3 py-1.5 rounded-md hover:bg-rose/10 disabled:opacity-50"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}

function EventoConfirmadoCard({ evento, onSaved }: { evento: EventoParticipacao; onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const rejeitados = evento.convidados.filter((c) => c.status === "REJEITADO" && c.motivoRejeicao);

  return (
    <div className="bg-paper border border-line rounded-md p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{evento.nome}</p>
          <p className="text-xs text-ink/50">{dateFmt(evento.data)}</p>
        </div>
        <Badge value={evento.status} />
      </div>

      {evento.convidados.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <span className="text-xs text-ink/50">Seus convidados</span>
          {evento.convidados.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 text-xs bg-surface border border-line rounded-md px-2.5 py-1.5"
            >
              <span className="text-ink">{c.nome}</span>
              <Badge value={c.status} />
            </div>
          ))}
          {rejeitados.length > 0 && (
            <div className="space-y-1 mt-1">
              {rejeitados.map((c) => (
                <p key={c.id} className="text-[11px] text-rose">
                  {c.nome}: {c.motivoRejeicao}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {evento.status === "PLANEJADO" &&
        (showForm ? (
          <ConvidadoForm
            participacaoEventoId={evento.id}
            onSaved={() => {
              setShowForm(false);
              onSaved();
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button onClick={() => setShowForm(true)} className="text-xs text-accent hover:underline mt-2">
            + Convidado
          </button>
        ))}
    </div>
  );
}

function ConvidadoForm({
  participacaoEventoId,
  onSaved,
  onCancel,
}: {
  participacaoEventoId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    await fetch(`/api/portal/eventos/${participacaoEventoId}/convidados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        cpf: cpf || null,
        email: email || null,
        telefone: telefone || null,
        empresa: empresa || null,
        faturamento: faturamento.trim() ? Number(faturamento.trim().replace(",", ".")) || null : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 bg-surface border border-line rounded-md p-3">
      <input
        required
        placeholder="Nome do convidado"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="input text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="input text-sm"
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input text-sm"
        />
        <input
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="input text-sm"
        />
        <input
          placeholder="Empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="input text-sm"
        />
      </div>
      <input
        placeholder="Faturamento (R$)"
        value={faturamento}
        onChange={(e) => setFaturamento(e.target.value)}
        className="input text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          disabled={saving || !nome.trim()}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Enviando..." : "Enviar convidado"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-ink/50 hover:underline">
          cancelar
        </button>
      </div>
    </form>
  );
}
