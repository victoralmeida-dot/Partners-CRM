import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const serie = await prisma.eventoSerie.update({
    where: { id: params.id },
    data: { nome: body.nome, descricao: body.descricao },
  });

  return NextResponse.json(serie);
}
