"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";

export default function PerfilPage() {
  const { data: session } = useSession();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (novaSenha !== confirmar) {
      setMsg({ tipo: "erro", texto: "A confirmação não bate com a nova senha." });
      return;
    }
    if (novaSenha.length < 6) {
      setMsg({ tipo: "erro", texto: "Use pelo menos 6 caracteres." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/me/senha", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setMsg({ tipo: "erro", texto: data.error || "Erro ao trocar senha." });
      return;
    }

    setMsg({ tipo: "ok", texto: "Senha alterada com sucesso." });
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmar("");
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Meu perfil</h1>
        <p className="text-ink/50 text-sm mt-1">{session?.user?.email}</p>
      </div>

      <form onSubmit={submit} className="bg-surface border border-line rounded-lg p-5 space-y-4">
        <h2 className="font-medium text-ink">Trocar senha</h2>

        {msg && (
          <p
            className={`text-sm rounded-md p-2 ${
              msg.tipo === "ok" ? "bg-accent/10 text-accent" : "bg-rose/10 text-rose"
            }`}
          >
            {msg.texto}
          </p>
        )}

        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Senha atual</span>
          <input
            required
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Nova senha</span>
          <input
            required
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Confirmar nova senha</span>
          <input
            required
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="input"
          />
        </label>
        <button
          disabled={saving}
          className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Trocar senha"}
        </button>
      </form>

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
