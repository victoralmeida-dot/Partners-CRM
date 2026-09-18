import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const consultor = await prisma.consultor.update({
      where: { id: params.id },
      data: {
        nome: body.nome,
        email: body.email || null,
        telefone: body.telefone || null,
      },
    });
    return NextResponse.json(consultor);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar consultor: " + (e.message || "erro desconhecido") },
      { status: 500 }
    );
  }
}

// Desativa em vez de apagar de verdade — indicações antigas continuam
// mostrando o nome de quem indicou normalmente, só some da lista de novos
// cadastros.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.consultor.update({ where: { id: params.id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
