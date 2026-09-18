"use client";

import { useEffect, useState, type FormEvent } from "react";
import Badge from "@/components/Badge";

type Tier = { id: string; nome: string; descricao: string | null; ordem: number };

const emptyForm = { nome: "", descricao: "", ordem: "0" };

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const load = () => fetch("/api/tiers").then((r) => r.json()).then(setTiers);

  useEffect(() => {
    load();
  }, []);

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    const res = await fetch("/api/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ordem: Number(form.ordem) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "Erro ao criar tier.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esse tier da lista de novos cadastros? Parceiros que já usam essa tag continuam mostrando ela normalmente.")) return;
    await fetch(`/api/tiers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tiers de parceiros</h1>
          <p className="text-ink/50 text-sm mt-1">
            Defina os níveis de parceria e o que cada um significa em termos de entregas e expectativas.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/90"
        >
          {showForm ? "Cancelar" : "+ Novo tier"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={adicionar} className="bg-surface border border-line rounded-lg p-5 space-y-4">
          {erro && <p className="text-sm bg-rose/10 text-rose rounded-md p-2">{erro}</p>}
          <div className="grid md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs text-ink/50 mb-1 block">Nome</span>
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
                placeholder="Ex: Platinum"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink/50 mb-1 block">Ordem (maior = mais alto)</span>
              <input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                className="input"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-ink/50 mb-1 block">
              O que esse tier significa (entregas/expectativas esperadas)
            </span>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="input"
              rows={3}
            />
          </label>
          <button
            disabled={saving}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar tier"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {tiers.map((t) =>
          editandoId === t.id ? (
            <TierEditCard
              key={t.id}
              tier={t}
              onSaved={() => {
                setEditandoId(null);
                load();
              }}
              onCancel={() => setEditandoId(null)}
            />
          ) : (
            <div key={t.id} className="bg-surface border border-line rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge value={t.nome.toUpperCase()} />
                  <span className="font-medium text-ink">{t.nome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditandoId(t.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </button>
                  <button onClick={() => remover(t.id)} className="text-xs text-rose hover:underline">
                    remover
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink/60">
                {t.descricao || <span className="italic text-ink/30">Sem descrição definida ainda.</span>}
              </p>
            </div>
          )
        )}
        {tiers.length === 0 && (
          <p className="text-sm text-ink/40 bg-surface border border-line rounded-lg p-6 text-center">
            Nenhum tier cadastrado ainda.
          </p>
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

function TierEditCard({
  tier,
  onSaved,
  onCancel,
}: {
  tier: Tier;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(tier.nome);
  const [descricao, setDescricao] = useState(tier.descricao ?? "");
  const [ordem, setOrdem] = useState(String(tier.ordem));
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    await fetch(`/api/tiers/${tier.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, ordem: Number(ordem) }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-surface border border-accent/40 rounded-lg p-4 space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
        <input
          type="number"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          className="input"
          placeholder="Ordem"
        />
      </div>
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="input"
        rows={3}
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
  );
}
