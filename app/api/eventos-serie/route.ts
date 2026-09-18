import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const series = await prisma.eventoSerie.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nome) {
    return NextResponse.json({ error: "Nome da série é obrigatório." }, { status: 400 });
  }

  try {
    const serie = await prisma.eventoSerie.create({
      data: { nome: body.nome, descricao: body.descricao ?? null },
    });
    return NextResponse.json(serie, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma série com esse nome." }, { status: 409 });
    }
    throw e;
  }
}
