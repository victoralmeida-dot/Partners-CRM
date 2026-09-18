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

  const nota = await prisma.notaIndicacao.create({
    data: {
      indicacaoId: body.indicacaoId,
      texto: body.texto.trim(),
    },
  });

  await registrarAuditoria("CRIAR", "NotaIndicacao", nota.id, `Nova nota em indicação ${body.indicacaoId}`);

  return NextResponse.json(nota, { status: 201 });
}
