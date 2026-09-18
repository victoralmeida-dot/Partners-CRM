import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const receitas = await prisma.receita.findMany({
    where:
      from && to
        ? { data: { gte: new Date(from), lte: new Date(to) } }
        : undefined,
    include: { partner: true },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(receitas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.origem || body.valor == null || !body.data) {
    return NextResponse.json(
      { error: "origem, valor e data são obrigatórios." },
      { status: 400 }
    );
  }

  const receita = await prisma.receita.create({
    data: {
      partnerId: body.partnerId || null,
      origem: body.origem,
      valor: body.valor,
      data: new Date(body.data),
      descricao: body.descricao || null,
      numeroNota: body.numeroNota || null,
    },
  });

  await registrarAuditoria(
    "CRIAR",
    "Receita",
    receita.id,
    `Lançou receita de ${receita.origem} — R$ ${receita.valor.toFixed(2)}${receita.descricao ? ` (${receita.descricao})` : ""}`
  );

  return NextResponse.json(receita, { status: 201 });
}
