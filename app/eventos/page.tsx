"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";

type ConvidadoEvento = {
  id: string;
  nome: string;
  empresa: string | null;
  status: string;
  motivoRejeicao: string | null;
};

type Participacao = {
  id: string;
  status: string;
  partner: { id: string; slug: string | null; nome: string };
  convidados: ConvidadoEvento[];
};

type EventoSerie = {
  id: string;
  nome: string;
  descricao: string | null;
};

type Evento = {
  id: string;
  nome: string;
  data: string;
  local: string | null;
  descricao: string | null;
  serieId: string | null;
  edicao: number | null;
  metaParceiros: number | null;
  serie: EventoSerie | null;
  participacoes: Participacao[];
};

type PartnerOpcao = { id: string; slug: string | null; nome: string };

// timeZone: "UTC" é essencial aqui — Evento.data é uma data "pura" (sem hora
// real), guardada como meia-noite UTC. Sem fixar o fuso, o navegador formata
// no fuso local (Brasil, UTC-3) e o dia exibido "volta" um dia (ex: evento
// lançado como 06/04 aparecia como 05/04).
const dateFmt = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(d));

// Data de hoje no calendário local, como "YYYY-MM-DD" — pra filtrar/comparar
// contra Evento.data (data pura) sem cair no problema de fuso horário.
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Quantos parceiros achamos que todo evento deveria ter, na média — usado só
// como referência visual no painel de próximos eventos (não trava nada).
const META_PARCEIROS_POR_EVENTO = 2;

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [series, setSeries] = useState<EventoSerie[]>([]);
  const [partners, setPartners] = useState<PartnerOpcao[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [serieExpandida, setSerieExpandida] = useState<string | null>(null);
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null);

  const load = () => fetch("/api/eventos").then((r) => r.json()).then(setEventos);
  const loadSeries = () => fetch("/api/eventos-serie").then((r) => r.json()).then(setSeries);
  const loadPartners = () =>
    fetch("/api/partners")
      .then((r) => r.json())
      .then((ps) => setPartners(ps.map((p: any) => ({ id: p.id, slug: p.slug, nome: p.nome }))));

  useEffect(() => {
    load();
    loadSeries();
    loadPartners();
  }, []);

  const { grupos, avulsos } = useMemo(() => {
    const bySerie = new Map<string, Evento[]>();
    const avulsosArr: Evento[] = [];
    for (const ev of eventos) {
      if (ev.serie) {
        const arr = bySerie.get(ev.serie.id) ?? [];
        arr.push(ev);
        bySerie.set(ev.serie.id, arr);
      } else {
        avulsosArr.push(ev);
      }
    }
    const gruposArr = [...bySerie.entries()].map(([, evs]) => {
      const ordenados = [...evs].sort((a, b) => (a.edicao ?? 0) - (b.edicao ?? 0));
      return { serie: ordenados[0].serie!, eventos: ordenados };
    });
    // Ordem alfabética pelo nome da série — fixa, não muda quando uma edição
    // nova é lançada (antes era por data da última edição, e a série pulava
    // de lugar toda vez que alguém lançava uma edição mais recente).
    gruposArr.sort((a, b) => a.serie.nome.localeCompare(b.serie.nome, "pt-BR"));
    avulsosArr.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return { grupos: gruposArr, avulsos: avulsosArr };
  }, [eventos]);

  const proximosEventos = useMemo(() => {
    const hoje = hojeISO();
    return eventos
      .filter((ev) => ev.data.slice(0, 10) >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos]);

  const irParaEvento = (ev: Evento) => {
    if (ev.serieId) setSerieExpandida(ev.serieId);
    setEventoExpandido(ev.id);
    requestAnimationFrame(() => {
      document.getElementById(`evento-${ev.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Eventos</h1>
          <p className="text-ink/50 text-sm mt-1">
            Catálogo de eventos, agrupados por série, e quais parceiros participaram de cada edição.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-accent text-white px-4 py-2 rounded-md"
        >
          {showForm ? "Cancelar" : "+ Novo evento"}
        </button>
      </div>

      <PainelProximosEventos eventos={proximosEventos} onSelecionar={irParaEvento} />

      {showForm && (
        <NovoEventoForm
          series={series}
          onSerieCriada={loadSeries}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {eventos.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-5">
          <p className="text-sm text-ink/40">Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <SerieGroup
              key={g.serie.id}
              serie={g.serie}
              eventos={g.eventos}
              series={series}
              partners={partners}
              expandida={serieExpandida === g.serie.id}
              onToggle={() => setSerieExpandida((cur) => (cur === g.serie.id ? null : g.serie.id))}
              onExpandir={() => setSerieExpandida(g.serie.id)}
              eventoExpandido={eventoExpandido}
              onToggleEvento={(id) => setEventoExpandido((cur) => (cur === id ? null : id))}
              onSaved={load}
            />
          ))}

          {avulsos.length > 0 && (
            <div className="bg-surface border border-line rounded-lg p-5">
              <p className="text-xs uppercase tracking-wide text-ink/40 mb-3">
                Eventos avulsos (ainda sem série)
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/40 text-xs uppercase">
                    <th className="py-2">Evento</th>
                    <th>Data</th>
                    <th>Parceiros</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {avulsos.map((ev) => (
                    <EventoCatalogoRow
                      key={ev.id}
                      evento={ev}
                      series={series}
                      partners={partners}
                      onSerieCriada={loadSeries}
                      expandido={eventoExpandido === ev.id}
                      onToggleExpand={() => setEventoExpandido((cur) => (cur === ev.id ? null : ev.id))}
                      onSaved={load}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

function PainelProximosEventos({
  eventos,
  onSelecionar,
}: {
  eventos: Evento[];
  onSelecionar: (ev: Evento) => void;
}) {
  if (eventos.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-lg p-5">
        <p className="text-sm font-medium text-ink">Próximos eventos</p>
        <p className="text-sm text-ink/40 mt-1">Nenhum evento futuro cadastrado ainda.</p>
      </div>
    );
  }

  const semParceiro = eventos.filter((ev) => ev.participacoes.length === 0).length;

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-ink">Próximos eventos — parceiros conectados</p>
        {semParceiro > 0 && (
          <span className="text-xs text-rose">
            {semParceiro} sem nenhum parceiro ainda
          </span>
        )}
      </div>
      <p className="text-xs text-ink/40 mb-3">
        Meta padrão: {META_PARCEIROS_POR_EVENTO} parceiros por evento (ajustável por edição). Clique num evento pra ir direto nele.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink/40 text-xs uppercase">
            <th className="py-2">Evento</th>
            <th>Data</th>
            <th>Parceiros</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {eventos.map((ev) => {
            const meta = ev.metaParceiros ?? META_PARCEIROS_POR_EVENTO;
            const total = ev.participacoes.length;
            const falta = Math.max(0, meta - total);
            const cor =
              total === 0 ? "text-rose" : falta > 0 ? "text-amber" : "text-accent";
            const icone = total === 0 ? "🔴" : falta > 0 ? "🟡" : "🟢";
            return (
              <tr
                key={ev.id}
                onClick={() => onSelecionar(ev)}
                className="cursor-pointer hover:bg-ink/5"
              >
                <td className="py-2 text-ink">{ev.nome}</td>
                <td className="text-ink/50 text-xs">{dateFmt(ev.data)}</td>
                <td className={`text-xs font-medium ${cor}`}>
                  {icone} {total}/{meta}
                  {falta > 0 && <span className="text-ink/40 font-normal"> · faltam {falta}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SerieGroup({
  serie,
  eventos,
  series,
  partners,
  expandida,
  onToggle,
  eventoExpandido,
  onToggleEvento,
  onSaved,
  onExpandir,
}: {
  serie: EventoSerie;
  eventos: Evento[];
  series: EventoSerie[];
  partners: PartnerOpcao[];
  expandida: boolean;
  onToggle: () => void;
  eventoExpandido: string | null;
  onToggleEvento: (id: string) => void;
  onSaved: () => void;
  onExpandir: () => void;
}) {
  const [showNovaEdicao, setShowNovaEdicao] = useState(false);
  const totalParticipacoes = eventos.reduce((acc, e) => acc + e.participacoes.length, 0);
  const ultima = eventos[eventos.length - 1];
  const proximaEdicao = Math.max(0, ...eventos.map((e) => e.edicao ?? 0)) + 1;

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div onClick={onToggle} className="flex-1 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{serie.nome}</span>
            <span className="text-xs text-ink/40">
              {eventos.length} edições · última em {dateFmt(ultima.data)}
            </span>
          </div>
          {serie.descricao && <p className="text-xs text-ink/50 mt-1">{serie.descricao}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setShowNovaEdicao(true);
              onExpandir();
            }}
            className="text-xs bg-accent text-white px-2.5 py-1.5 rounded-md whitespace-nowrap"
          >
            + Nova edição
          </button>
          <span onClick={onToggle} className="text-ink/40 text-xs cursor-pointer">
            {expandida ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {showNovaEdicao && (
        <div className="mt-4">
          <NovaEdicaoForm
            serie={serie}
            proximaEdicao={proximaEdicao}
            onSaved={() => {
              setShowNovaEdicao(false);
              onSaved();
            }}
            onCancel={() => setShowNovaEdicao(false)}
          />
        </div>
      )}

      {expandida && (
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left text-ink/40 text-xs uppercase">
              <th className="py-2">Edição</th>
              <th>Data</th>
              <th>Parceiros</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {eventos.map((ev) => (
              <EventoCatalogoRow
                key={ev.id}
                evento={ev}
                series={series}
                partners={partners}
                onSerieCriada={() => {}}
                expandido={eventoExpandido === ev.id}
                onToggleExpand={() => onToggleEvento(ev.id)}
                onSaved={onSaved}
                mostrarEdicaoComoNome
              />
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-ink/30 mt-2">{totalParticipacoes} participações no total da série</p>
    </div>
  );
}

function NovaEdicaoForm({
  serie,
  proximaEdicao,
  onSaved,
  onCancel,
}: {
  serie: EventoSerie;
  proximaEdicao: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState("");
  const [edicao, setEdicao] = useState(proximaEdicao.toString());
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [metaParceiros, setMetaParceiros] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data || !edicao) return;
    setSaving(true);
    const nome = `${serie.nome} #${edicao.padStart(2, "0")}`;
    await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        data,
        local: local || null,
        descricao: descricao || null,
        serieId: serie.id,
        edicao: Number(edicao),
        metaParceiros: metaParceiros ? Number(metaParceiros) : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start bg-paper border border-line rounded-md p-3">
      <label className="block">
        <span className="text-xs text-ink/50 mb-1 block">Edição nº</span>
        <input
          required
          type="number"
          min="1"
          value={edicao}
          onChange={(e) => setEdicao(e.target.value)}
          className="input"
        />
      </label>
      <label className="block">
        <span className="text-xs text-ink/50 mb-1 block">Data</span>
        <input required type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
      </label>
      <label className="block sm:col-span-2 lg:col-span-2">
        <span className="text-xs text-ink/50 mb-1 block">Local (opcional)</span>
        <input value={local} onChange={(e) => setLocal(e.target.value)} className="input" placeholder="Ex: HUB SP" />
      </label>
      <label className="block">
        <span className="text-xs text-ink/50 mb-1 block">Meta de parceiros</span>
        <input
          type="number"
          min="1"
          value={metaParceiros}
          onChange={(e) => setMetaParceiros(e.target.value)}
          className="input"
          placeholder={`Padrão (${META_PARCEIROS_POR_EVENTO})`}
        />
      </label>
      <label className="block sm:col-span-2 lg:col-span-4">
        <span className="text-xs text-ink/50 mb-1 block">Descrição (opcional)</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="input"
          rows={2}
        />
      </label>
      <p className="text-xs text-ink/40 sm:col-span-2 lg:col-span-4">
        Vai ser criado como <strong>"{serie.nome} #{edicao.padStart(2, "0")}"</strong>
      </p>
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
        <button
          disabled={saving}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar edição"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-ink/50 hover:underline">
          cancelar
        </button>
      </div>
    </form>
  );
}

function EventoCatalogoRow({
  evento,
  series,
  partners,
  onSerieCriada,
  expandido,
  onToggleExpand,
  onSaved,
  mostrarEdicaoComoNome,
}: {
  evento: Evento;
  series: EventoSerie[];
  partners: PartnerOpcao[];
  onSerieCriada: () => void;
  expandido: boolean;
  onToggleExpand: () => void;
  onSaved: () => void;
  mostrarEdicaoComoNome?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [showAdicionarParceiro, setShowAdicionarParceiro] = useState(false);
  const [showAtribuirConvite, setShowAtribuirConvite] = useState(false);

  const convidadosPendentes = evento.participacoes.flatMap((p) =>
    p.convidados
      .filter((c) => c.status === "PENDENTE")
      .map((c) => ({ ...c, partnerNome: p.partner.nome }))
  );

  if (editando) {
    return (
      <EventoCatalogoEditRow
        evento={evento}
        series={series}
        onSerieCriada={onSerieCriada}
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
      <tr id={`evento-${evento.id}`} className="hover:bg-ink/5 scroll-mt-4">
        <td onClick={onToggleExpand} className="py-2 cursor-pointer">
          {mostrarEdicaoComoNome && evento.edicao != null ? `Edição ${evento.edicao}` : evento.nome}
        </td>
        <td onClick={onToggleExpand} className="text-ink/50 text-xs cursor-pointer">
          {dateFmt(evento.data)}
        </td>
        <td onClick={onToggleExpand} className="text-xs text-ink/60 cursor-pointer">
          {evento.participacoes.length}
          {evento.metaParceiros != null && (
            <span className="text-ink/30">/{evento.metaParceiros}</span>
          )}
        </td>
        <td className="text-right">
          <button onClick={() => setEditando(true)} className="text-xs text-accent hover:underline">
            editar
          </button>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-paper">
          <td colSpan={4} className="py-3">
            {evento.descricao && <p className="text-xs text-ink/60 mb-2">{evento.descricao}</p>}
            {evento.local && <p className="text-xs text-ink/40 mb-2">📍 {evento.local}</p>}
            {evento.participacoes.length === 0 ? (
              <p className="text-xs text-ink/40 mb-2">Nenhum parceiro vinculado a este evento ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-2">
                {evento.participacoes.map((p) => (
                  <Link
                    key={p.id}
                    href={`/partners/${p.partner.slug ?? p.partner.id}`}
                    className="flex items-center gap-1.5 text-xs bg-ink/5 text-ink/70 border border-ink/15 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-ink/10"
                  >
                    {p.partner.nome}
                    <Badge value={p.status} />
                  </Link>
                ))}
              </div>
            )}

            {convidadosPendentes.length > 0 && (
              <div className="mb-3 bg-amber/5 border border-amber/20 rounded-md p-3">
                <p className="text-xs font-medium text-ink/70 mb-2">
                  Convidados aguardando aprovação
                </p>
                <div className="space-y-2">
                  {convidadosPendentes.map((c) => (
                    <ConvidadoPendenteRow key={c.id} convidado={c} onSaved={onSaved} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {showAdicionarParceiro ? (
                <AdicionarParceiroForm
                  evento={evento}
                  partners={partners}
                  onSaved={() => {
                    setShowAdicionarParceiro(false);
                    onSaved();
                  }}
                  onCancel={() => setShowAdicionarParceiro(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAdicionarParceiro(true)}
                  className="text-xs bg-accent text-white px-2.5 py-1.5 rounded-md"
                >
                  + Adicionar parceiro
                </button>
              )}

              {showAtribuirConvite ? (
                <AtribuirConviteForm
                  evento={evento}
                  partners={partners}
                  onSaved={() => {
                    setShowAtribuirConvite(false);
                    onSaved();
                  }}
                  onCancel={() => setShowAtribuirConvite(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAtribuirConvite(true)}
                  className="text-xs border border-accent text-accent px-2.5 py-1.5 rounded-md hover:bg-accent/10"
                >
                  + Atribuir evento (convite)
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function AdicionarParceiroForm({
  evento,
  partners,
  onSaved,
  onCancel,
}: {
  evento: Evento;
  partners: PartnerOpcao[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const jaParticipam = new Set(evento.participacoes.map((p) => p.partner.id));
  const disponiveis = partners.filter((p) => !jaParticipam.has(p.id));

  const [partnerId, setPartnerId] = useState("");
  const [status, setStatus] = useState("REALIZADO");
  const [participacaoPalco, setParticipacaoPalco] = useState(false);
  const [quemParticipou, setQuemParticipou] = useState("");
  const [participacaoPlateia, setParticipacaoPlateia] = useState(false);
  const [mailingEnviado, setMailingEnviado] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setSaving(true);
    await fetch("/api/participacoes-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        eventoId: evento.id,
        status,
        participacaoPalco,
        quemParticipou: participacaoPalco ? quemParticipou : null,
        participacaoPlateia,
        mailingEnviado,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start bg-surface border border-line rounded-md p-3">
      <label className="block sm:col-span-2 lg:col-span-2">
        <span className="text-xs text-ink/50 mb-1 block">Parceiro</span>
        <select required value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input">
          <option value="">Selecione...</option>
          {disponiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2 lg:col-span-2">
        <span className="text-xs text-ink/50 mb-1 block">Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
          <option value="PLANEJADO">Planejado</option>
          <option value="REALIZADO">Realizado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </label>
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
          className="input sm:col-span-2 lg:col-span-2"
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
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={mailingEnviado}
          onChange={(e) => setMailingEnviado(e.target.checked)}
        />
        Mailing enviado
      </label>
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
        <button
          disabled={saving || !partnerId}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar participação"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-ink/50 hover:underline">
          cancelar
        </button>
      </div>
    </form>
  );
}

function AtribuirConviteForm({
  evento,
  partners,
  onSaved,
  onCancel,
}: {
  evento: Evento;
  partners: PartnerOpcao[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const jaParticipam = new Set(evento.participacoes.map((p) => p.partner.id));
  const disponiveis = partners.filter((p) => !jaParticipam.has(p.id));

  const [partnerId, setPartnerId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setSaving(true);
    await fetch("/api/participacoes-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId, eventoId: evento.id, status: "CONVITE_ENVIADO" }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 bg-surface border border-line rounded-md p-3">
      <label className="block">
        <span className="text-xs text-ink/50 mb-1 block">Convidar parceiro pro evento</span>
        <select required value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input">
          <option value="">Selecione...</option>
          {disponiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={saving || !partnerId}
        className="text-xs bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-50"
      >
        {saving ? "Enviando..." : "Enviar convite"}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-ink/50 hover:underline">
        cancelar
      </button>
      <p className="text-xs text-ink/40 w-full">
        O parceiro vai ver o convite no Portal dele e precisa aceitar antes de poder enviar convidados.
      </p>
    </form>
  );
}

function ConvidadoPendenteRow({
  convidado,
  onSaved,
}: {
  convidado: ConvidadoEvento & { partnerNome: string };
  onSaved: () => void;
}) {
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const aprovar = async () => {
    setSaving(true);
    await fetch(`/api/convidados-evento/${convidado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APROVADO" }),
    });
    setSaving(false);
    onSaved();
  };

  const rejeitar = async () => {
    if (!motivo.trim()) return;
    setSaving(true);
    await fetch(`/api/convidados-evento/${convidado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJEITADO", motivoRejeicao: motivo.trim() }),
    });
    setSaving(false);
    setRejeitando(false);
    onSaved();
  };

  return (
    <div className="bg-surface border border-line rounded-md p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-ink font-medium truncate">{convidado.nome}</p>
          <p className="text-[10px] text-ink/40">
            {convidado.partnerNome}
            {convidado.empresa ? ` · ${convidado.empresa}` : ""}
          </p>
        </div>
        {!rejeitando && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={aprovar}
              disabled={saving}
              className="text-xs text-accent hover:underline disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              onClick={() => setRejeitando(true)}
              disabled={saving}
              className="text-xs text-rose hover:underline disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
        )}
      </div>
      {rejeitando && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="input text-xs"
            rows={2}
            placeholder="Motivo da rejeição (obrigatório)"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={rejeitar}
              disabled={saving || !motivo.trim()}
              className="text-xs bg-rose text-white px-2 py-1 rounded-md disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Confirmar rejeição"}
            </button>
            <button
              onClick={() => {
                setRejeitando(false);
                setMotivo("");
              }}
              className="text-xs text-ink/50 hover:underline"
            >
              cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventoCatalogoEditRow({
  evento,
  series,
  onSerieCriada,
  onSaved,
  onCancel,
}: {
  evento: Evento;
  series: EventoSerie[];
  onSerieCriada: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(evento.nome);
  const [data, setData] = useState(evento.data.slice(0, 10));
  const [local, setLocal] = useState(evento.local ?? "");
  const [descricao, setDescricao] = useState(evento.descricao ?? "");
  const [serieId, setSerieId] = useState(evento.serieId ?? "");
  const [edicao, setEdicao] = useState(evento.edicao?.toString() ?? "");
  const [metaParceiros, setMetaParceiros] = useState(evento.metaParceiros?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    await fetch(`/api/eventos/${evento.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        data,
        local,
        descricao,
        serieId: serieId || null,
        edicao: edicao ? Number(edicao) : null,
        metaParceiros: metaParceiros ? Number(metaParceiros) : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <tr className="bg-paper">
      <td colSpan={4} className="py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="input sm:col-span-2"
            placeholder="Nome do evento"
          />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="input"
            placeholder="Local"
          />
          <div className="sm:col-span-2">
            <SerieSelect series={series} value={serieId} onChange={setSerieId} onSerieCriada={onSerieCriada} />
          </div>
          <input
            type="number"
            min="1"
            value={edicao}
            onChange={(e) => setEdicao(e.target.value)}
            className="input"
            placeholder="Edição"
          />
          <input
            type="number"
            min="1"
            value={metaParceiros}
            onChange={(e) => setMetaParceiros(e.target.value)}
            className="input"
            placeholder={`Meta parceiros (${META_PARCEIROS_POR_EVENTO})`}
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="input sm:col-span-2 lg:col-span-4"
            placeholder="Descrição"
            rows={2}
          />
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
      </td>
    </tr>
  );
}

function SerieSelect({
  series,
  value,
  onChange,
  onSerieCriada,
}: {
  series: EventoSerie[];
  value: string;
  onChange: (serieId: string) => void;
  onSerieCriada: () => void;
}) {
  const [criandoNova, setCriandoNova] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    if (!novoNome.trim()) return;
    setSaving(true);
    const res = await fetch("/api/eventos-serie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome.trim() }),
    });
    const criada = await res.json();
    setSaving(false);
    setCriandoNova(false);
    setNovoNome("");
    onSerieCriada();
    onChange(criada.id);
  };

  if (criandoNova) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          placeholder="Nome da nova série"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          className="input"
        />
        <button
          type="button"
          onClick={criar}
          disabled={saving}
          className="text-xs bg-accent text-white px-2 py-1.5 rounded-md whitespace-nowrap disabled:opacity-50"
        >
          {saving ? "..." : "Criar"}
        </button>
        <button
          type="button"
          onClick={() => setCriandoNova(false)}
          className="text-xs text-ink/50 hover:underline whitespace-nowrap"
        >
          cancelar
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => (e.target.value === "__nova__" ? setCriandoNova(true) : onChange(e.target.value))}
      className="input"
    >
      <option value="">Sem série (evento avulso)</option>
      {series.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nome}
        </option>
      ))}
      <option value="__nova__">+ Criar nova série</option>
    </select>
  );
}

function NovoEventoForm({
  series,
  onSerieCriada,
  onSaved,
}: {
  series: EventoSerie[];
  onSerieCriada: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [serieId, setSerieId] = useState("");
  const [edicao, setEdicao] = useState("");
  const [metaParceiros, setMetaParceiros] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        data,
        local,
        descricao,
        serieId: serieId || null,
        edicao: edicao ? Number(edicao) : null,
        metaParceiros: metaParceiros ? Number(metaParceiros) : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface border border-line rounded-lg p-5">
      <input
        required
        placeholder="Nome do evento"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="input sm:col-span-2"
      />
      <input required type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
      <input
        placeholder="Local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="input"
      />
      <div className="sm:col-span-2">
        <SerieSelect series={series} value={serieId} onChange={setSerieId} onSerieCriada={onSerieCriada} />
      </div>
      <input
        type="number"
        min="1"
        placeholder="Edição (opcional)"
        value={edicao}
        onChange={(e) => setEdicao(e.target.value)}
        className="input"
      />
      <input
        type="number"
        min="1"
        placeholder={`Meta de parceiros (padrão ${META_PARCEIROS_POR_EVENTO})`}
        value={metaParceiros}
        onChange={(e) => setMetaParceiros(e.target.value)}
        className="input"
      />
      <textarea
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="input sm:col-span-2 lg:col-span-4"
        rows={2}
      />
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 py-2 sm:col-span-2 lg:col-span-4 w-fit disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar evento"}
      </button>
    </form>
  );
}
