"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

const linksBase = [
  { href: "/", label: "Dashboard" },
  { href: "/partners", label: "Partners" },
  { href: "/indicacoes", label: "Indicações" },
  { href: "/eventos", label: "Eventos" },
  { href: "/cronograma", label: "Cronograma" },
  { href: "/metas", label: "Lançamentos" },
  { href: "/tiers", label: "Tiers" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ANALISTA: "Analista",
  PARCEIRO: "Parceiro",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  // Papel Parceiro usa o Portal do Parceiro (app/portal), que roda sem esta
  // sidebar (ver AppShell) — este ramo só existe pra não quebrar caso a
  // sidebar chegue a renderizar antes do redirect do middleware.
  const links =
    role === "PARCEIRO"
      ? [{ href: "/portal", label: "Meu portal" }]
      : role === "ADMIN"
      ? [...linksBase, { href: "/usuarios", label: "Usuários" }, { href: "/auditoria", label: "Auditoria" }]
      : linksBase;

  return (
    <aside className="w-56 min-h-screen bg-surface text-ink flex flex-col shrink-0 border-r border-line">
      <div className="px-5 py-6 border-b border-line">
        <img src="/logo-ep.png" alt="Ecommerce Puro" className="h-12 w-auto logo-ep" />
        <p className="font-semibold text-lg leading-tight mt-2">Partners CRM</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent text-white font-medium"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-line space-y-3">
        {session?.user && (
          <div className="text-xs">
            <p className="text-ink/80 font-medium">{session.user.name}</p>
            <p className="text-ink/40">{role ? ROLE_LABEL[role] ?? role : ""}</p>
            <div className="flex items-center gap-2 mt-1">
              <Link href="/perfil" className="text-accent hover:underline">
                Meu perfil
              </Link>
              <span className="text-ink/20">·</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-accent hover:underline"
              >
                Sair
              </button>
            </div>
          </div>
        )}
        <ThemeToggle />
        <p className="text-xs text-ink/40">Ambiente local · dados não expostos</p>
      </div>
    </aside>
  );
}
