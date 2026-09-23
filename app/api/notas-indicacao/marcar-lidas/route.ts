import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Chamado quando o admin abre o "Ver mais" de uma indicação — marca as notas
// que o parceiro escreveu (autor: PARCEIRO) como lidas, pra sumir o
// sinalizador de "nova mensagem" no card.
export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (!body.indicacaoId) {
    return NextResponse.json({ error: "indicacaoId é obrigatório." }, { status: 400 });
  }

  await prisma.notaIndicacao.updateMany({
    where: { indicacaoId: body.indicacaoId, autor: "PARCEIRO", lida: false },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
