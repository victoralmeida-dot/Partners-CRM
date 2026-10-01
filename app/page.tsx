"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import BarChart from "@/components/BarChart";
import MetasParceiroMesTable from "@/components/MetasParceiroMesTable";

type DashboardData = {
  periodoSelecionado: string;
  totalPartners: number;
  partnersPrioritarios: number;
  indicacoesMes: number;
  indicacoesTotal: number;
  taxaConversao: number;
  comissaoPendente: number;
  comissaoPaga: number;
  acoesProximas: {
    id: string;
    titulo: string;
    dataPlanejada: string;
    partner: { nome: string };
    status: string;
  }[];
  rankingPartners: { nome: string; convertidas: number; total: number }[];
  metasParceiroMes: {
    id: string;
    partnerId: string;
    partnerNome: string;
    valorMeta: number;
    realizado: number;
    pct: number;
  }[];
  indicacoesRecentesMes: {
    id: string;
    leadNome: string;
    quemIndicou: string | null;
    status: string;
    data: string;
    partner: { nome: string };
  }[];
};

type MesDado = { periodo: string; label: string; meta: number | null; atingido: number };
type DashboardMetas = { ano: number; meses: MesDado[]; trimestres: MesDado[] };

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// timeZone: "UTC" — Acao.dataPlanejada e Indicacao.data são datas "puras"
// (guardadas como meia-noite UTC); sem fixar o fuso, o fuso local (Brasil,
// UTC-3) faz o dia exibido voltar um dia.
const dateFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(d));

// Data de hoje no calendário local do usuário, como string "YYYY-MM-DD" — pra
// comparar com datas "puras" (que só têm sentido como string de calendário,
// não como instante exato) sem cair no mesmo problema de fuso horário.
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const mesAtualISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Formata "YYYY-MM" como "Setembro/2026" — monta a data em UTC meio-dia só
// pra evitar que o fuso local jogue o mês pra trás ao formatar.
const mesLabel = (periodo: string) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${periodo}-01T12:00:00Z`)
  );

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [metasData, setMetasData] = useState<DashboardMetas | null>(null);
  const [periodo, setPeriodo] = useState(mesAtualISO);

  useEffect(() => {
    fetch(`/api/dashboard?mes=${periodo}`)
      .then((r) => r.json())
      .then(setData);
  }, [periodo]);

  useEffect(() => {
    fetch(`/api/dashboard-metas?ano=${new Date().getFullYear()}`)
      .then((r) => r.json())
      .then(setMetasData);
  }, []);

  if (!data) {
    return <p className="text-ink/50">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard de resultados</h1>
          <p className="text-ink/50 text-sm mt-1">
            Visão geral de indicações, comissões e ações de parcerias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="input text-sm w-auto"
          />
          {periodo !== mesAtualISO() && (
            <button
              onClick={() => setPeriodo(mesAtualISO())}
              className="text-xs text-accent hover:underline"
            >
              mês atual
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Partners prioritários"
          value={`${data.partnersPrioritarios} / ${data.totalPartners}`}
          hint="Acompanhamento próximo"
        />
        <StatCard
          label={`Indicações em ${mesLabel(data.periodoSelecionado)}`}
          value={String(data.indicacoesMes)}
          tone="accent"
        />
        <StatCard
          label="Taxa de conversão"
          value={`${(data.taxaConversao * 100).toFixed(0)}%`}
          hint={`${data.indicacoesTotal} indicações no total`}
        />
        <StatCard
          label="Comissão pendente"
          value={currency(data.comissaoPendente)}
          tone="amber"
        />
      </div>

      {metasData && (() => {
        const mesAtual = new Date().getMonth();
        const trimAtual = Math.floor(mesAtual / 3);
        const trimestre = metasData.trimestres[trimAtual];
        const mesesDoTrimestre = metasData.meses.slice(trimAtual * 3, trimAtual * 3 + 3);
        return (
          <div className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-medium text-ink">
                Meta de parcerias — {trimestre.label} {metasData.ano}
              </h2>
              <Link href="/metas" className="text-xs text-accent hover:underline">
                ver detalhes e configurar
              </Link>
            </div>
            <p className="text-sm text-ink/50 mb-4">
              {currency(trimestre.atingido)}
              {trimestre.meta ? ` de ${currency(trimestre.meta)}` : " (meta não definida)"}
              {trimestre.meta && (
                <span className={trimestre.atingido >= trimestre.meta ? "text-accent" : "text-amber"}>
                  {" "}
                  · {((trimestre.atingido / trimestre.meta) * 100).toFixed(0)}%
                </span>
              )}
            </p>
            <BarChart data={mesesDoTrimestre} />
          </div>
        );
      })()}

      <div className="bg-surface border border-line rounded-lg p-5">
        <h2 className="font-medium text-ink mb-3">
          Metas de indicação por parceiro ({mesLabel(data.periodoSelecionado)})
        </h2>
        <MetasParceiroMesTable metas={data.metasParceiroMes} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-ink">Próximas ações</h2>
            <Link href="/cronograma" className="text-xs text-accent hover:underline">
              ver cronograma
            </Link>
          </div>
          {data.acoesProximas.length === 0 ? (
            <p className="text-sm text-ink/40">Nenhuma ação planejada por enquanto.</p>
          ) : (
            <ul className="space-y-2">
              {data.acoesProximas.map((a) => {
                const atrasada = a.dataPlanejada.slice(0, 10) < hojeISO();
                return (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className={atrasada ? "text-rose" : "text-ink"}>
                        {atrasada && "⚠️ "}
                        {a.titulo}
                      </p>
                      <p className="text-ink/40 text-xs">{a.partner.nome}</p>
                    </div>
                    <span className={`text-xs shrink-0 ml-2 ${atrasada ? "text-rose" : "text-ink/50"}`}>
                      {dateFmt(a.dataPlanejada)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-surface border border-line rounded-lg p-5">
          <h2 className="font-medium text-ink mb-3">Ranking de partners</h2>
          {data.rankingPartners.length === 0 ? (
            <p className="text-sm text-ink/40">Nenhuma indicação registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {data.rankingPartners.slice(0, 8).map((p) => (
                <li key={p.nome} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{p.nome}</span>
                  <span className="text-ink/50 text-xs">
                    {p.convertidas} convertidas · {p.total} no total
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-ink">
            Indicações em {mesLabel(data.periodoSelecionado)}
          </h2>
          <Link href="/indicacoes" className="text-xs text-accent hover:underline">
            ver todas
          </Link>
        </div>
        {data.indicacoesRecentesMes.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhuma indicação registrada nesse período.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.indicacoesRecentesMes.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{i.leadNome}</p>
                  <p className="text-ink/40 text-xs">
                    {i.partner.nome}
                    {i.quemIndicou ? ` · indicado por ${i.quemIndicou}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-ink/50 text-xs">{dateFmt(i.data)}</span>
                  <Badge value={i.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-surface border border-line rounded-lg p-5 flex items-center gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Comissão paga (total)</p>
          <p className="text-xl font-semibold text-accent mt-1">{currency(data.comissaoPaga)}</p>
        </div>
        <div className="h-8 w-px bg-line" />
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Comissão pendente</p>
          <p className="text-xl font-semibold text-amber mt-1">{currency(data.comissaoPendente)}</p>
        </div>
      </div>
    </div>
  );
}
