"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import { exportarCSV } from "@/lib/exportarCSV";

type Partner = {
  id: string;
  slug: string | null;
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
  indicacoes: { status: string }[];
  eventos: { id: string; status: string }[];
  onboarding: { concluido: boolean }[];
};

const emptyForm = {
  nome: "",
  tier: "BRONZE",
  status: "EM_ATIVACAO",
  categoria: "",
  prioritario: false,
  mantenedor: false,
  contatoPrincipal: "",
  contatoEmail: "",
  cotaEventosContratados: "",
};

// Parser simples de CSV: aceita vírgula como separador e aspas duplas pra
// campos com vírgula dentro. Suficiente pra planilhas exportadas do Excel/Sheets.
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

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [tiers, setTiers] = useState<{ id: string; nome: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [avisoIcpFechado, setAvisoIcpFechado] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => fetch("/api/partners").then((r) => r.json()).then(setPartners);

  useEffect(() => {
    load();
    fetch("/api/tiers")
      .then((r) => r.json())
      .then(setTiers);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cotaEventosContratados: form.cotaEventosContratados
          ? Number(form.cotaEventosContratados)
          : null,
      }),
    });
    setSaving(false);
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Importando...");
    const text = await file.text();
    const rows = parseCSV(text);
    const res = await fetch("/api/partners/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partners: rows }),
    });
    const result = await res.json();
    setImportMsg(
      `Importação concluída: ${result.criados} criados, ${result.atualizados} atualizados.` +
        (result.erros?.length ? ` ${result.erros.length} linha(s) ignorada(s).` : "")
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  const filtered = partners.filter((p) =>
    p.nome.toLowerCase().includes(search.trim().toLowerCase())
  );
  const prioritarios = filtered.filter((p) => p.prioritario);
  const outros = filtered.filter((p) => !p.prioritario);

  const semIcp = partners.filter(
    (p) =>
      p.icpFaturamentoMin == null &&
      p.icpFaturamentoMax == null &&
      p.icpPedidosMin == null &&
      !p.icpSegmento &&
      !p.icpCaracteristicas
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Partners</h1>
          <p className="text-ink/50 text-sm mt-1">
            {partners.length} cadastrados · {prioritarios.length} em acompanhamento próximo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const linhas = partners.map((p) => ({
                nome: p.nome,
                tier: p.tier,
                status: p.status,
                categoria: p.categoria ?? "",
                prioritario: p.prioritario ? "sim" : "",
                mantenedor: p.mantenedor ? "sim" : "",
                contatoPrincipal: p.contatoPrincipal ?? "",
                icpFaturamentoMin: p.icpFaturamentoMin ?? "",
                icpFaturamentoMax: p.icpFaturamentoMax ?? "",
                icpPedidosMin: p.icpPedidosMin ?? "",
                icpSegmento: p.icpSegmento ?? "",
                indicacoes: p.indicacoes.length,
                convertidas: p.indicacoes.filter((i) => i.status === "CONVERTIDA").length,
                eventos: p.eventos.length,
                cotaEventos: p.cotaEventosContratados ?? "",
              }));
              exportarCSV(`partners-${new Date().toISOString().slice(0, 10)}.csv`, linhas);
            }}
            className="bg-surface border border-line text-ink text-sm px-4 py-2 rounded-md hover:bg-paper"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-surface border border-line text-ink text-sm px-4 py-2 rounded-md hover:bg-paper"
          >
            Importar CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/90"
          >
            {showForm ? "Cancelar" : "+ Novo partner"}
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="bg-surface border border-line rounded-lg p-3 text-sm text-ink/70 flex items-center justify-between">
          <span>{importMsg}</span>
          <button onClick={() => setImportMsg(null)} className="text-ink/40 text-xs hover:underline">
            fechar
          </button>
        </div>
      )}

      {semIcp.length > 0 && !avisoIcpFechado && (
        <div className="bg-amber/10 border border-amber/30 rounded-lg p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink">
              <strong className="text-amber">{semIcp.length} de {partners.length} parceiros</strong> ainda
              sem ICP (Perfil de Cliente Ideal) definido.
            </p>
            <p className="text-xs text-ink/50 mt-1">
              {semIcp.slice(0, 6).map((p) => p.nome).join(", ")}
              {semIcp.length > 6 ? ` e mais ${semIcp.length - 6}...` : ""}
            </p>
          </div>
          <button
            onClick={() => setAvisoIcpFechado(true)}
            className="text-xs text-ink/40 hover:underline shrink-0"
          >
            ocultar
          </button>
        </div>
      )}

      <div className="relative max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar parceiro pelo nome..."
          className="input pl-9"
        />
      </div>

      <details className="bg-surface border border-line rounded-lg p-4 text-sm text-ink/60">
        <summary className="cursor-pointer font-medium text-ink/70">
          Como montar o CSV pra importação em massa
        </summary>
        <div className="mt-3 space-y-2">
          <p>
            Crie uma planilha (Excel/Sheets) com essas colunas na primeira linha, depois exporte
            como CSV:
          </p>
          <code className="block bg-surface border border-line rounded-md p-2 text-xs overflow-x-auto">
            nome,tier,status,categoria,prioritario,mantenedor,contatoPrincipal,contatoEmail,observacoes
          </code>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>tier</b>: GOLD, SILVER ou BRONZE</li>
            <li><b>status</b>: ATIVO, EM_ATIVACAO ou PAUSADO</li>
            <li><b>prioritario</b> e <b>mantenedor</b>: escreva "sim" ou deixe em branco</li>
            <li>Se o nome já existir no sistema, a linha <b>atualiza</b> o partner em vez de duplicar</li>
          </ul>
        </div>
      </details>

      {showForm && (
        <form onSubmit={submit} className="bg-surface border border-line rounded-lg p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nome">
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Categoria">
              <input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="input"
                placeholder="Ex: Marketplace, Financeiro..."
              />
            </Field>
            <Field label="Tier">
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
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                <option value="ATIVO">Ativo</option>
                <option value="EM_ATIVACAO">Em ativação</option>
                <option value="PAUSADO">Pausado</option>
              </select>
            </Field>
            <Field label="Contato principal">
              <input
                value={form.contatoPrincipal}
                onChange={(e) => setForm({ ...form, contatoPrincipal: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="E-mail do contato">
              <input
                type="email"
                value={form.contatoEmail}
                onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Cota de eventos contratados (opcional)">
              <input
                type="number"
                min="0"
                value={form.cotaEventosContratados}
                onChange={(e) => setForm({ ...form, cotaEventosContratados: e.target.value })}
                className="input"
                placeholder="Ex: 18"
              />
            </Field>
          </div>
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
          <button
            disabled={saving}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar partner"}
          </button>
        </form>
      )}

      <Section title="Acompanhamento próximo" partners={prioritarios} />
      <Section title="Demais partners ativos" partners={outros} />

      {filtered.length === 0 && (
        <p className="text-sm text-ink/40 bg-surface border border-line rounded-lg p-6 text-center">
          Nenhum parceiro encontrado com esse nome.
        </p>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-ink/50 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, partners }: { title: string; partners: Partner[] }) {
  if (partners.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-medium text-ink/60 uppercase tracking-wide mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <PartnerCard key={p.id} partner={p} />
        ))}
      </div>
    </div>
  );
}

function PartnerCard({ partner: p }: { partner: Partner }) {
  const convertidas = p.indicacoes.filter((i) => i.status === "CONVERTIDA").length;
  // Cota contratada conta só participações REALIZADAS — planejada/cancelada não gasta cota.
  const eventosRealizados = p.eventos.filter((e) => e.status === "REALIZADO").length;

  return (
    <Link
      href={`/partners/${p.slug ?? p.id}`}
      className="block bg-surface border border-line rounded-lg p-4 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink leading-tight">{p.nome}</p>
          {p.categoria && <p className="text-xs text-ink/40 mt-0.5">{p.categoria}</p>}
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          {p.mantenedor && <Badge value="MANTENEDOR" />}
          <Badge value={p.tier} />
        </div>
      </div>

      {p.contatoPrincipal && (
        <p className="text-xs text-ink/50 mt-3">👤 {p.contatoPrincipal}</p>
      )}

      {p.onboarding.length > 0 && (() => {
        const concluidos = p.onboarding.filter((i) => i.concluido).length;
        const completo = concluidos === p.onboarding.length;
        return (
          <p className={`text-xs mt-1 ${completo ? "text-accent" : "text-amber"}`}>
            {completo ? "✅" : "🚀"} Onboarding: {concluidos}/{p.onboarding.length}
          </p>
        );
      })()}

      {p.eventos.length > 0 || p.cotaEventosContratados != null ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-ink/40 mb-1">
            <span>Eventos</span>
            <span>
              {p.cotaEventosContratados != null
                ? `${eventosRealizados}/${p.cotaEventosContratados}`
                : `${p.eventos.length} registrado${p.eventos.length === 1 ? "" : "s"} (sem cota definida)`}
            </span>
          </div>
          {p.cotaEventosContratados != null && (
            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${Math.min(100, (eventosRealizados / p.cotaEventosContratados) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
        <div className="text-xs text-ink/40">
          {p.indicacoes.length} indicações · {convertidas} convertidas
        </div>
        <Badge value={p.status} />
      </div>
    </Link>
  );
}
