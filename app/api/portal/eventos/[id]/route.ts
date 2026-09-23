import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

// Aceitar/recusar convite de evento. O partnerId vem só da sessão — a
// participação é buscada por id e conferida contra esse partnerId antes de
// qualquer alteração, pra um parceiro nunca conseguir mexer na participação
// de outro trocando o id na URL (mesma regra do resto do Portal).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const partnerId = (session?.user as any)?.partnerId as string | undefined;

  if (!session?.user || !partnerId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  if (body.acao !== "aceitar" && body.acao !== "recusar") {
    return NextResponse.json({ error: "acao deve ser 'aceitar' ou 'recusar'." }, { status: 400 });
  }

  const participacao = await prisma.participacaoEvento.findUnique({
    where: { id: params.id },
    include: { evento: true },
  });

  if (!participacao || participacao.partnerId !== partnerId) {
    return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  }

  if (participacao.status !== "CONVITE_ENVIADO") {
    return NextResponse.json({ error: "Este convite já foi respondido." }, { status: 400 });
  }

  const novoStatus = body.acao === "aceitar" ? "PLANEJADO" : "CANCELADO";

  const atualizada = await prisma.participacaoEvento.update({
    where: { id: params.id },
    data: { status: novoStatus },
  });

  await registrarAuditoria(
    "ATUALIZAR",
    "ParticipacaoEvento",
    atualizada.id,
    `Parceiro ${body.acao === "aceitar" ? "aceitou" : "recusou"} o convite pro evento "${participacao.evento.nome}"`
  );

  return NextResponse.json(atualizada);
}
