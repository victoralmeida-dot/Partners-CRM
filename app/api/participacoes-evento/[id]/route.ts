import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const participacao = await prisma.participacaoEvento.update({
    where: { id: params.id },
    data: {
      eventoId: body.eventoId,
      status: body.status,
      participacaoPalco: body.participacaoPalco,
      quemParticipou: body.quemParticipou,
      participacaoPlateia: body.participacaoPlateia,
      conteudoPalestra: body.conteudoPalestra,
      mailingEnviado: body.mailingEnviado,
      mailingData: body.mailingData ? new Date(body.mailingData) : body.mailingData === null ? null : undefined,
    },
    include: { evento: true, convidados: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(participacao);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.participacaoEvento.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
