import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const eventos = await prisma.evento.findMany({
    include: { participacoes: { include: { partner: true } }, serie: true },
    orderBy: { data: "desc" },
  });
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nome || !body.data) {
    return NextResponse.json({ error: "nome e data são obrigatórios." }, { status: 400 });
  }

  const evento = await prisma.evento.create({
    data: {
      nome: body.nome,
      data: new Date(body.data),
      local: body.local ?? null,
      descricao: body.descricao ?? null,
      serieId: body.serieId ?? null,
      edicao: body.edicao ?? null,
    },
  });

  return NextResponse.json(evento, { status: 201 });
}
