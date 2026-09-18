import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const tier = await prisma.tier.update({
      where: { id: params.id },
      data: {
        nome: body.nome,
        descricao: body.descricao || null,
        ordem: body.ordem,
      },
    });
    return NextResponse.json(tier);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar tier: " + (e.message || "erro desconhecido") },
      { status: 500 }
    );
  }
}

// Desativa em vez de apagar — parceiros que já usam esse tier continuam
// mostrando a tag normalmente, só some da lista de novos cadastros.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.tier.update({ where: { id: params.id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
