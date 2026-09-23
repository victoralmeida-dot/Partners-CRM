import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

// Parceiro comenta numa indicação própria. partnerId vem só da sessão — a
// indicação é conferida contra esse partnerId antes de aceitar a nota.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const partnerId = (session?.user as any)?.partnerId as string | undefined;

  if (!session?.user || !partnerId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const indicacao = await prisma.indicacao.findUnique({ where: { id: params.id } });
  if (!indicacao || indicacao.partnerId !== partnerId) {
    return NextResponse.json({ error: "Indicação não encontrada." }, { status: 404 });
  }

  const body = await req.json();
  if (!body.texto?.trim()) {
    return NextResponse.json({ error: "texto é obrigatório." }, { status: 400 });
  }

  // "não lida" pelo admin até ele abrir o "Ver mais" da indicação em /indicacoes.
  const nota = await prisma.notaIndicacao.create({
    data: {
      indicacaoId: params.id,
      texto: body.texto.trim(),
      autor: "PARCEIRO",
      lida: false,
    },
  });

  await registrarAuditoria(
    "CRIAR",
    "NotaIndicacao",
    nota.id,
    `Parceiro comentou na indicação "${indicacao.leadNome}"`
  );

  return NextResponse.json(nota, { status: 201 });
}
