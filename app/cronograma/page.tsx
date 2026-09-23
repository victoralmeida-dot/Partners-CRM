"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";

type Acao = {
  id: string;
  titulo: string;
  tipo: string;
  dataPlanejada: string;
  status: string;
  responsavel: string | null;
  partner: { id: string; nome: string };
};

// timeZone: "UTC" — Acao.dataPlanejada é data "pura" (meia-noite UTC); sem
// fixar o fuso, o fuso local (Brasil, UTC-3) faz o dia exibido voltar um dia.
const dateFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "UTC" }).format(
    new Date(d)
  );

// Data de hoje no calendário local do usuário, como "YYYY-MM-DD" — comparar
// contra isso em vez de um instante exato evita o mesmo problema de fuso.
function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isAtrasada(acao: Acao) {
  return acao.status === "PLANEJADA" && acao.dataPlanejada.slice(0, 10) < hoje();
}

export default function CronogramaPage() {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "planejadas">("planejadas");

  const load = () => fetch("/api/acoes").then((r) => r.json()).then(setAcoes);

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/acoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const filtradas = acoes.filter((a) => filtro === "todas" || a.status === "PLANEJADA");
  const atrasadas = acoes.filter(isAtrasada);

  const porData: Record<string, Acao[]> = {};
  for (const a of filtradas) {
    const key = new Date(a.dataPlanejada).toISOString().slice(0, 10);
    if (!porData[key]) porData[key] = [];
    porData[key].push(a);
  }
  const datas = Object.keys(porData).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cronograma de ações</h1>
          <p className="text-ink/50 text-sm mt-1">
            Ações planejadas por partner. Cadastre novas ações direto na página do partner.
          </p>
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as "todas" | "planejadas")}
          className="text-sm border border-line rounded-md px-2 py-1.5"
        >
          <option value="planejadas">Somente planejadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {atrasadas.length > 0 && (
        <div className="bg-rose/10 border border-rose/30 rounded-lg p-3">
          <p className="text-sm text-rose font-medium">
            ⚠️ {atrasadas.length} ação{atrasadas.length > 1 ? "ões" : ""} atrasada
            {atrasadas.length > 1 ? "s" : ""} — passou da data e ainda está como "Planejada".
          </p>
        </div>
      )}

      {datas.length === 0 ? (
        <p className="text-sm text-ink/40 bg-surface border border-line rounded-lg p-6 text-center">
          Nenhuma ação encontrada com esse filtro.
        </p>
      ) : (
        <div className="space-y-4">
          {datas.map((data) => {
            const temAtrasada = porData[data].some(isAtrasada);
            return (
              <div
                key={data}
                className={`bg-surface border rounded-lg p-4 ${
                  temAtrasada ? "border-rose/40" : "border-line"
                }`}
              >
                <p
                  className={`text-xs uppercase tracking-wide mb-2 ${
                    temAtrasada ? "text-rose" : "text-ink/50"
                  }`}
                >
                  {dateFmt(data)}
                  {temAtrasada ? " · atrasado" : ""}
                </p>
                <ul className="divide-y divide-line">
                  {porData[data].map((a) => {
                    const atrasada = isAtrasada(a);
                    return (
                      <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className={`font-medium ${atrasada ? "text-rose" : "text-ink"}`}>
                            {atrasada && "⚠️ "}
                            {a.titulo}
                          </p>
                          <p className="text-ink/40 text-xs">
                            {a.partner.nome} · {a.tipo.replaceAll("_", " ")}
                            {a.responsavel ? ` · ${a.responsavel}` : ""}
                          </p>
                        </div>
                        <select
                          value={a.status}
                          onChange={(e) => updateStatus(a.id, e.target.value)}
                          className="text-xs border border-line rounded-md px-1.5 py-1"
                        >
                          <option value="PLANEJADA">Planejada</option>
                          <option value="CONCLUIDA">Concluída</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
