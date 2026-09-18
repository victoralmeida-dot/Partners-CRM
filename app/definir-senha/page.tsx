"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DefinirSenhaPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [checando, setChecando] = useState(true);
  const [valido, setValido] = useState(false);
  const [erroInicial, setErroInicial] = useState<string | null>(null);
  const [nomeUser, setNomeUser] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      setErroInicial("Link inválido — token não encontrado.");
      setChecando(false);
      return;
    }
    fetch(`/api/definir-senha?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setValido(data.valido);
        if (data.valido) {
          setNomeUser(data.nome);
        } else {
          setErroInicial(data.erro);
        }
        setChecando(false);
      });
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (novaSenha !== confirmar) {
      setErro("A confirmação não bate com a senha.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("Use pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/definir-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, novaSenha }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error || "Erro ao definir senha.");
      return;
    }

    setSucesso(true);
    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0B0B0E", color: "#F4F5F7" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-wider text-white/50">Ecommerce Puro</p>
          <p className="font-semibold text-2xl mt-1">Partners CRM</p>
        </div>

        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: "#17171C", border: "1px solid #2A2A31" }}
        >
          {checando ? (
            <p className="text-sm text-white/50 text-center">Verificando link...</p>
          ) : !valido ? (
            <div className="text-center space-y-2">
              <p className="text-sm" style={{ color: "#E5484D" }}>
                {erroInicial}
              </p>
              <p className="text-xs text-white/40">
                Peça pro administrador gerar um novo link de acesso pra você.
              </p>
            </div>
          ) : sucesso ? (
            <div className="text-center space-y-2">
              <p className="text-sm" style={{ color: "#3B82F6" }}>
                Senha definida com sucesso!
              </p>
              <p className="text-xs text-white/40">Te levando pra tela de login...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-white/70 text-center mb-2">
                Bem-vindo(a), <strong>{nomeUser}</strong>! Defina sua senha de acesso.
              </p>

              {erro && (
                <p
                  className="text-sm rounded-md p-2"
                  style={{ backgroundColor: "rgba(229,72,77,0.1)", color: "#E5484D" }}
                >
                  {erro}
                </p>
              )}

              <label className="block">
                <span className="text-xs text-white/50 mb-1 block">Nova senha</span>
                <input
                  required
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm"
                  style={{ backgroundColor: "#1C1C22", border: "1px solid #2A2A31", color: "#F4F5F7" }}
                />
              </label>

              <label className="block">
                <span className="text-xs text-white/50 mb-1 block">Confirmar senha</span>
                <input
                  required
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm"
                  style={{ backgroundColor: "#1C1C22", border: "1px solid #2A2A31", color: "#F4F5F7" }}
                />
              </label>

              <button
                disabled={saving}
                className="w-full text-white text-sm rounded-md px-4 py-2 disabled:opacity-50"
                style={{ backgroundColor: "#3B82F6" }}
              >
                {saving ? "Salvando..." : "Definir senha e continuar"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-white/30 text-center mt-4">
          Ambiente local · dados não expostos
        </p>
      </div>
    </div>
  );
}
