import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tiers = await prisma.tier.findMany({
    where: { ativo: true },
    orderBy: { ordem: "desc" },
  });
  return NextResponse.json(tiers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nome = (body.nome || "").trim();

  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const tier = await prisma.tier.create({
      data: {
        nome,
        descricao: body.descricao || null,
        ordem: body.ordem ?? 0,
      },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Já existe um tier com esse nome." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar tier: " + (e.message || "erro desconhecido") },
      { status: 500 }
    );
  }
}
