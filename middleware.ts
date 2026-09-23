import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Papel "Parceiro" só pode ver o próprio Portal do Parceiro — qualquer
    // outra rota do painel redireciona pra lá. Ajuste este bloco quando o
    // acesso externo de parceiro for de fato liberado (ver conversa sobre
    // hospedagem) — hoje o Portal também só roda local, igual ao resto do app.
    if (token?.role === "PARCEIRO") {
      const partnerId = token.partnerId as string | null;
      const rotaPermitida = partnerId ? "/portal" : "/sem-acesso";
      const podeAcessar =
        pathname === rotaPermitida || pathname.startsWith("/api/");

      if (!podeAcessar) {
        return NextResponse.redirect(new URL(rotaPermitida, req.url));
      }
    }

    // Só Admin gerencia usuários e vê a trilha de auditoria
    if (
      (pathname.startsWith("/usuarios") || pathname.startsWith("/auditoria")) &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protege tudo, exceto login, definir-senha (link público de acesso), assets estáticos
  // do Next e arquivos estáticos da pasta public/ (logo, imagens, etc.) — sem essa última
  // exclusão, um <img src="/logo-ep.png"> era redirecionado pro /login antes de carregar
  // (inclusive na própria tela de login, que também precisa da imagem sem estar autenticado).
  matcher: [
    "/((?!login|definir-senha|api/definir-senha|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
