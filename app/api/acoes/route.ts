import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const acoes = await prisma.acao.findMany({
    include: { partner: true },
    orderBy: { dataPlanejada: "asc" },
  });
  return NextResponse.json(acoes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.partnerId || !body.titulo || !body.dataPlanejada) {
    return NextResponse.json(
      { error: "partnerId, titulo e dataPlanejada são obrigatórios." },
      { status: 400 }
    );
  }

  const acao = await prisma.acao.create({
    data: {
      partnerId: body.partnerId,
      tipo: body.tipo ?? "FOLLOW_UP",
      titulo: body.titulo,
      dataPlanejada: new Date(body.dataPlanejada),
      status: body.status ?? "PLANEJADA",
      responsavel: body.responsavel ?? null,
      descricao: body.descricao ?? null,
    },
  });

  return NextResponse.json(acao, { status: 201 });
}
