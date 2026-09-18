import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const consultores = await prisma.consultor.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(consultores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nome = (body.nome || "").trim();

  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const consultor = await prisma.consultor.create({
      data: {
        nome,
        email: body.email || null,
        telefone: body.telefone || null,
      },
    });
    return NextResponse.json(consultor, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      // já existe — só reativa e atualiza os dados, caso tivesse sido removido antes
      const existente = await prisma.consultor.update({
        where: { nome },
        data: { ativo: true, email: body.email || null, telefone: body.telefone || null },
      });
      return NextResponse.json(existente, { status: 200 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar consultor: " + (e.message || "erro desconhecido") },
      { status: 500 }
    );
  }
}
