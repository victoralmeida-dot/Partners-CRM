import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET() {
  const notas = await prisma.notaIndicacao.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.indicacaoId || !body.texto?.trim()) {
    return NextResponse.json(
      { error: "indicacaoId e texto são obrigatórios." },
      { status: 400 }
    );
  }

  // Nota criada pelo admin — "não lida" pelo parceiro até ele abrir o
  // detalhe da indicação no Portal (ver PUT /api/portal/indicacoes/[id]).
  const nota = await prisma.notaIndicacao.create({
    data: {
      indicacaoId: body.indicacaoId,
      texto: body.texto.trim(),
      autor: "ADMIN",
      lida: false,
    },
  });

  await registrarAuditoria("CRIAR", "NotaIndicacao", nota.id, `Nova nota em indicação ${body.indicacaoId}`);

  return NextResponse.json(nota, { status: 201 });
}
