import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const evento = await prisma.evento.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      data: body.data ? new Date(body.data) : undefined,
      local: body.local,
      descricao: body.descricao,
      serieId: body.serieId !== undefined ? body.serieId : undefined,
      edicao: body.edicao !== undefined ? body.edicao : undefined,
      metaParceiros: body.metaParceiros !== undefined ? body.metaParceiros : undefined,
    },
  });

  return NextResponse.json(evento);
}
