import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Abrir o detalhe de uma indicação no Portal: marca as notas do admin como
// lidas (some o sinalizador de "nova mensagem") e devolve a conversa
// completa. partnerId vem só da sessão — nunca por parâmetro da URL, mesma
// regra do resto do Portal.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const partnerId = (session?.user as any)?.partnerId as string | undefined;

  if (!session?.user || !partnerId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  if (body.acao !== "marcar_notas_lidas") {
    return NextResponse.json({ error: "acao inválida." }, { status: 400 });
  }

  const indicacao = await prisma.indicacao.findUnique({ where: { id: params.id } });
  if (!indicacao || indicacao.partnerId !== partnerId) {
    return NextResponse.json({ error: "Indicação não encontrada." }, { status: 404 });
  }

  await prisma.notaIndicacao.updateMany({
    where: { indicacaoId: params.id, autor: "ADMIN", lida: false },
    data: { lida: true },
  });

  const notas = await prisma.notaIndicacao.findMany({
    where: { indicacaoId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notas });
}
