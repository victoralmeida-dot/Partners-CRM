import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const acao = await prisma.acao.update({
    where: { id: params.id },
    data: {
      tipo: body.tipo,
      titulo: body.titulo,
      dataPlanejada: body.dataPlanejada ? new Date(body.dataPlanejada) : undefined,
      status: body.status,
      responsavel: body.responsavel,
      descricao: body.descricao,
    },
  });

  return NextResponse.json(acao);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.acao.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
