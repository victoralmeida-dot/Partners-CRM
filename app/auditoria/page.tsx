"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";

type LogEntry = {
  id: string;
  userNome: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  detalhe: string | null;
  createdAt: string;
};

const dateFmt = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

const ACAO_BADGE: Record<string, string> = {
  CRIAR: "ATIVO",
  ATUALIZAR: "EM_ATIVACAO",
  REMOVER: "PERDIDA",
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtroEntidade, setFiltroEntidade] = useState("Todas");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/auditoria")
      .then((r) => r.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setCarregando(false);
      });
  }, []);

  const entidades = ["Todas", ...Array.from(new Set(logs.map((l) => l.entidade)))];
  const filtrados = filtroEntidade === "Todas" ? logs : logs.filter((l) => l.entidade === filtroEntidade);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Trilha de auditoria</h1>
          <p className="text-ink/50 text-sm mt-1">
            Quem fez o quê, e quando — últimas 300 ações registradas no sistema.
          </p>
        </div>
        <select
          value={filtroEntidade}
          onChange={(e) => setFiltroEntidade(e.target.value)}
          className="text-sm border border-line rounded-md px-2 py-1.5"
          style={{ backgroundColor: "rgb(var(--input-bg))", color: "rgb(var(--c-ink))" }}
        >
          {entidades.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {carregando ? (
        <p className="text-sm text-ink/40">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-ink/40 bg-surface border border-line rounded-lg p-6 text-center">
          Nenhuma ação registrada ainda{filtroEntidade !== "Todas" ? ` para "${filtroEntidade}"` : ""}.
        </p>
      ) : (
        <div className="bg-surface border border-line rounded-lg divide-y divide-line">
          {filtrados.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <Badge value={ACAO_BADGE[log.acao] ?? "ATIVO"} />
                <div>
                  <p className="text-ink">{log.detalhe ?? `${log.acao} em ${log.entidade}`}</p>
                  <p className="text-xs text-ink/40">
                    {log.userNome} · {log.entidade}
                  </p>
                </div>
              </div>
              <span className="text-xs text-ink/40 shrink-0">{dateFmt(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
