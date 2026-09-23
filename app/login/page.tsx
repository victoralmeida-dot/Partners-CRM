"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const res = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0B0B0E", color: "#F4F5F7" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-ep.png" alt="Ecommerce Puro" className="h-[300px] w-[300px] mx-auto mb-3" />
          <p className="font-semibold text-2xl mt-1">Partners CRM</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-lg p-6 space-y-4"
          style={{ backgroundColor: "#17171C", border: "1px solid #2A2A31" }}
        >
          {erro && (
            <p
              className="text-sm rounded-md p-2"
              style={{ backgroundColor: "rgba(229,72,77,0.1)", color: "#E5484D" }}
            >
              {erro}
            </p>
          )}

          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">E-mail</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{ backgroundColor: "#1C1C22", border: "1px solid #2A2A31", color: "#F4F5F7" }}
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50 mb-1 block">Senha</span>
            <input
              required
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{ backgroundColor: "#1C1C22", border: "1px solid #2A2A31", color: "#F4F5F7" }}
            />
          </label>

          <button
            disabled={loading}
            className="w-full text-white text-sm rounded-md px-4 py-2 disabled:opacity-50"
            style={{ backgroundColor: "#3B82F6" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-white/30 text-center mt-4">
          Ambiente local · dados não expostos
        </p>
      </div>
    </div>
  );
}
