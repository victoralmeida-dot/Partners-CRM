"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";

type Participacao = {
  id: string;
  status: string;
  partner: { id: string; slug: string | null; nome: string };
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
  serie: EventoSerie | null;
  participacoes: Participacao[];
};

const dateFmt = (d: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(d));

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [series, setSeries] = useState<EventoSerie[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [serieExpandida, setSerieExpandida] = useState<string | null>(null);
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null);

  const load = () => fetch("/api/eventos").then((r) => r.json()).then(setEventos);
  const loadSeries = () => fetch("/api/eventos-serie").then((r) => r.json()).then(setSeries);

  useEffect(() => {
    load();
    loadSeries();
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
    gruposArr.sort((a, b) => {
      const ultimaA = a.eventos[a.eventos.length - 1].data;
      const ultimaB = b.eventos[b.eventos.length - 1].data;
      return new Date(ultimaB).getTime() - new Date(ultimaA).getTime();
    });
    avulsosArr.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return { grupos: gruposArr, avulsos: avulsosArr };
  }, [eventos]);

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
    </div>
  );
}

function SerieGroup({
  serie,
  eventos,
  series,
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
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-4 gap-2 items-start bg-paper border border-line rounded-md p-3">
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
      <label className="block md:col-span-2">
        <span className="text-xs text-ink/50 mb-1 block">Local (opcional)</span>
        <input value={local} onChange={(e) => setLocal(e.target.value)} className="input" placeholder="Ex: HUB SP" />
      </label>
      <label className="block md:col-span-4">
        <span className="text-xs text-ink/50 mb-1 block">Descrição (opcional)</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="input"
          rows={2}
        />
      </label>
      <p className="text-xs text-ink/40 md:col-span-4">
        Vai ser criado como <strong>"{serie.nome} #{edicao.padStart(2, "0")}"</strong>
      </p>
      <div className="flex items-center gap-2 md:col-span-4">
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
  onSerieCriada,
  expandido,
  onToggleExpand,
  onSaved,
  mostrarEdicaoComoNome,
}: {
  evento: Evento;
  series: EventoSerie[];
  onSerieCriada: () => void;
  expandido: boolean;
  onToggleExpand: () => void;
  onSaved: () => void;
  mostrarEdicaoComoNome?: boolean;
}) {
  const [editando, setEditando] = useState(false);

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
      <tr className="hover:bg-ink/5">
        <td onClick={onToggleExpand} className="py-2 cursor-pointer">
          {mostrarEdicaoComoNome && evento.edicao != null ? `Edição ${evento.edicao}` : evento.nome}
        </td>
        <td onClick={onToggleExpand} className="text-ink/50 text-xs cursor-pointer">
          {dateFmt(evento.data)}
        </td>
        <td onClick={onToggleExpand} className="text-xs text-ink/60 cursor-pointer">
          {evento.participacoes.length}
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
              <p className="text-xs text-ink/40">Nenhum parceiro vinculado a este evento ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
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
          </td>
        </tr>
      )}
    </Fragment>
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
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <tr className="bg-paper">
      <td colSpan={4} className="py-3">
        <div className="grid md:grid-cols-4 gap-2 items-center">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="input md:col-span-2"
            placeholder="Nome do evento"
          />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="input"
            placeholder="Local"
          />
          <div className="md:col-span-2">
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
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="input md:col-span-4"
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
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-4 gap-3 bg-surface border border-line rounded-lg p-5">
      <input
        required
        placeholder="Nome do evento"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="input md:col-span-2"
      />
      <input required type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
      <input
        placeholder="Local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="input"
      />
      <div className="md:col-span-2">
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
      <textarea
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="input md:col-span-4"
        rows={2}
      />
      <button
        disabled={saving}
        className="bg-accent text-white text-sm rounded-md px-3 py-2 md:col-span-4 w-fit disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar evento"}
      </button>
    </form>
  );
}
