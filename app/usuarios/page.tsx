"use client";

import { useEffect, useState, type FormEvent } from "react";

type User = {
  id: string;
  email: string;
  nome: string;
  role: string;
  partnerId: string | null;
  ativo: boolean;
  setupToken: string | null;
  setupTokenExpira: string | null;
};

type Partner = { id: string; nome: string };

const emptyForm = { email: "", nome: "", role: "ANALISTA", partnerId: "" };

const dateFmt = (d: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(d));

function montarLinkAcesso(token: string) {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return `${origem}/definir-senha?token=${token}`;
}

function montarEmailAcesso(nome: string, link: string) {
  const params = new URLSearchParams({
    subject: "Seu acesso ao Partners CRM — Ecommerce Puro",
    body: [
      `Olá, ${nome}!`,
      "",
      "Sua conta no Partners CRM da Ecommerce Puro já está pronta.",
      "Clica no link abaixo pra definir sua senha de acesso (é de uso único, então não repassa pra ninguém):",
      "",
      link,
      "",
      "Qualquer dúvida, me chama.",
    ].join("\n"),
  });
  return `mailto:?${params.toString()}`;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkRecemCriado, setLinkRecemCriado] = useState<{ nome: string; link: string } | null>(null);
  const [linkPorUsuario, setLinkPorUsuario] = useState<Record<string, string>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const load = () => fetch("/api/users").then((r) => r.json()).then(setUsers);

  useEffect(() => {
    load();
    fetch("/api/partners")
      .then((r) => r.json())
      .then((p) => setPartners(p.map((x: any) => ({ id: x.id, nome: x.nome }))));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setErro(data.error || "Erro ao criar usuário.");
      return;
    }
    const novoUser = await res.json();
    setLinkRecemCriado({ nome: novoUser.nome, link: montarLinkAcesso(novoUser.setupToken) });
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const toggleAtivo = async (u: User) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: u.nome, role: u.role, partnerId: u.partnerId, ativo: !u.ativo }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esse usuário? Ele perde acesso imediatamente.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  };

  const reenviarLink = async (u: User) => {
    const res = await fetch(`/api/users/${u.id}/reenviar-link`, { method: "POST" });
    const data = await res.json();
    setLinkPorUsuario({ ...linkPorUsuario, [u.id]: montarLinkAcesso(data.setupToken) });
  };

  const nomeParceiro = (id: string | null) => partners.find((p) => p.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Usuários e acessos</h1>
          <p className="text-ink/50 text-sm mt-1">
            Gerencie quem acessa o CRM e com qual nível de permissão.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-white text-sm px-4 py-2 rounded-md hover:bg-accent/90"
        >
          {showForm ? "Cancelar" : "+ Novo usuário"}
        </button>
      </div>

      {linkRecemCriado && (
        <div className="bg-surface border border-accent/40 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink">
              <strong>{linkRecemCriado.nome}</strong> criado(a). Manda o link de acesso pra ele(a) definir a própria senha:
            </p>
            <button
              onClick={() => setLinkRecemCriado(null)}
              className="text-xs text-ink/40 hover:underline shrink-0"
            >
              fechar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input readOnly value={linkRecemCriado.link} className="input text-xs" />
            <a
              href={montarEmailAcesso(linkRecemCriado.nome, linkRecemCriado.link)}
              className="text-xs bg-accent text-white px-3 py-2 rounded-md whitespace-nowrap"
            >
              ✉️ Enviar por e-mail
            </a>
          </div>
          <p className="text-xs text-ink/40">Esse link vale por 7 dias e só funciona uma vez.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-surface border border-line rounded-lg p-5 space-y-4">
          {erro && <p className="text-sm bg-rose/10 text-rose rounded-md p-2">{erro}</p>}
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-ink/50 mb-1 block">Nome</span>
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink/50 mb-1 block">E-mail</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink/50 mb-1 block">Papel</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input"
              >
                <option value="ADMIN">Admin — acesso total, gerencia usuários</option>
                <option value="ANALISTA">Analista — acesso operacional completo</option>
                <option value="PARCEIRO">Parceiro — só a própria ficha</option>
              </select>
            </label>
            {form.role === "PARCEIRO" && (
              <label className="block">
                <span className="text-xs text-ink/50 mb-1 block">Qual parceiro?</span>
                <select
                  required
                  value={form.partnerId}
                  onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                  className="input"
                >
                  <option value="">Selecione...</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="text-xs text-ink/40">
            Você não define a senha aqui — depois de criar, você recebe um link único pra
            enviar à pessoa, e ela mesma escolhe a senha.
          </p>
          <button
            disabled={saving}
            className="bg-accent text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      )}

      <div className="bg-surface border border-line rounded-lg divide-y divide-line">
        {users.map((u) => {
          const linkGerado = linkPorUsuario[u.id];
          const linkAtivo =
            u.setupToken && u.setupTokenExpira && new Date(u.setupTokenExpira) > new Date();

          if (editandoId === u.id) {
            return (
              <div key={u.id} className="px-5 py-4">
                <UserEditCard
                  user={u}
                  partners={partners}
                  onSaved={() => {
                    setEditandoId(null);
                    load();
                  }}
                  onCancel={() => setEditandoId(null)}
                />
              </div>
            );
          }

          return (
            <div key={u.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {u.nome} {!u.ativo && <span className="text-xs text-rose ml-1">(inativo)</span>}
                  </p>
                  <p className="text-xs text-ink/40">
                    {u.email}
                    {u.role === "PARCEIRO" ? ` · ${nomeParceiro(u.partnerId)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      u.role === "ADMIN"
                        ? "text-accent border-accent/30 bg-accent/10"
                        : u.role === "PARCEIRO"
                        ? "text-ink/50 border-ink/15 bg-ink/5"
                        : "text-ink/70 border-ink/20 bg-ink/5"
                    }`}
                  >
                    {u.role === "ADMIN" ? "Admin" : u.role === "PARCEIRO" ? "Parceiro" : "Analista"}
                  </span>
                  {linkAtivo ? (
                    <span className="text-xs text-amber">
                      link pendente até {dateFmt(u.setupTokenExpira!)}
                    </span>
                  ) : (
                    <button
                      onClick={() => reenviarLink(u)}
                      className="text-xs text-accent hover:underline"
                    >
                      gerar link de acesso
                    </button>
                  )}
                  {linkAtivo && (
                    <button
                      onClick={() => reenviarLink(u)}
                      className="text-xs text-accent hover:underline"
                    >
                      reenviar
                    </button>
                  )}
                  <button
                    onClick={() => setEditandoId(u.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </button>
                  <button onClick={() => toggleAtivo(u)} className="text-xs text-accent hover:underline">
                    {u.ativo ? "desativar" : "ativar"}
                  </button>
                  <button onClick={() => remove(u.id)} className="text-xs text-rose hover:underline">
                    remover
                  </button>
                </div>
              </div>
              {linkGerado && (
                <div className="mt-2 flex items-center gap-2 bg-paper border border-line rounded-md p-2">
                  <input readOnly value={linkGerado} className="input text-xs" />
                  <a
                    href={montarEmailAcesso(u.nome, linkGerado)}
                    className="text-xs bg-accent text-white px-3 py-1.5 rounded-md whitespace-nowrap"
                  >
                    ✉️ Enviar
                  </a>
                </div>
              )}
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="text-sm text-ink/40 p-5 text-center">Nenhum usuário cadastrado ainda.</p>
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

function UserEditCard({
  user,
  partners,
  onSaved,
  onCancel,
}: {
  user: User;
  partners: Partner[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [partnerId, setPartnerId] = useState(user.partnerId ?? "");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSaving(true);
    setErro(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        email,
        role,
        partnerId: role === "PARCEIRO" ? partnerId : null,
        ativo: user.ativo,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "Erro ao salvar usuário.");
      return;
    }
    onSaved();
  };

  return (
    <div className="bg-surface border border-accent/40 rounded-lg p-4 space-y-3">
      {erro && <p className="text-sm bg-rose/10 text-rose rounded-md p-2">{erro}</p>}
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink/50 mb-1 block">Papel</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <option value="ADMIN">Admin — acesso total, gerencia usuários</option>
            <option value="ANALISTA">Analista — acesso operacional completo</option>
            <option value="PARCEIRO">Parceiro — só a própria ficha</option>
          </select>
        </label>
        {role === "PARCEIRO" && (
          <label className="block">
            <span className="text-xs text-ink/50 mb-1 block">Qual parceiro?</span>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="input"
            >
              <option value="">Selecione...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
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
