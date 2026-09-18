import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET() {
  const indicacoes = await prisma.indicacao.findMany({
    include: { partner: true, comissao: true },
    orderBy: { data: "desc" },
  });
  return NextResponse.json(indicacoes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.partnerId || !body.leadNome) {
    return NextResponse.json(
      { error: "partnerId e leadNome são obrigatórios." },
      { status: 400 }
    );
  }

  const indicacao = await prisma.indicacao.create({
    data: {
      partnerId: body.partnerId,
      origem: body.origem || "EP_PARA_PARCEIRO",
      leadNome: body.leadNome,
      telefone: body.telefone ?? null,
      email: body.email ?? null,
      cnpj: body.cnpj ?? null,
      faturamento: body.faturamento ?? null,
      quemIndicou: body.quemIndicou ?? null,
      status: body.status ?? "ENVIADA",
      valorEstimado: body.valorEstimado ?? null,
      observacoes: body.observacoes ?? null,
      data: body.data ? new Date(body.data) : new Date(),
    },
  });

  await registrarAuditoria("CRIAR", "Indicacao", indicacao.id, `Nova indicação: "${indicacao.leadNome}"`);

  return NextResponse.json(indicacao, { status: 201 });
}
