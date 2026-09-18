import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Papel "Parceiro" só pode ver a própria ficha — qualquer outra rota
    // do painel redireciona pra lá. Ajuste este bloco quando o acesso
    // externo de parceiro for de fato liberado (ver conversa sobre hospedagem).
    if (token?.role === "PARCEIRO") {
      const partnerId = token.partnerId as string | null;
      const rotaPermitida = partnerId ? `/partners/${partnerId}` : "/sem-acesso";
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
  // Protege tudo, exceto login, definir-senha (link público de acesso) e assets estáticos do Next
  matcher: ["/((?!login|definir-senha|api/definir-senha|_next/static|_next/image|favicon.ico).*)"],
};
