import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const receita = await prisma.receita.update({
    where: { id: params.id },
    data: {
      partnerId: body.partnerId,
      origem: body.origem,
      valor: body.valor,
      data: body.data ? new Date(body.data) : undefined,
      descricao: body.descricao,
      numeroNota: body.numeroNota,
    },
  });

  await registrarAuditoria(
    "ATUALIZAR",
    "Receita",
    receita.id,
    `Editou lançamento de ${receita.origem} — R$ ${receita.valor.toFixed(2)}${receita.descricao ? ` (${receita.descricao})` : ""}`
  );

  return NextResponse.json(receita);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const receita = await prisma.receita.findUnique({ where: { id: params.id } });
  await prisma.receita.delete({ where: { id: params.id } });
  await registrarAuditoria(
    "REMOVER",
    "Receita",
    params.id,
    `Removeu lançamento de ${receita?.origem ?? "?"} — R$ ${receita?.valor.toFixed(2) ?? "?"}${receita?.descricao ? ` (${receita.descricao})` : ""}`
  );
  return NextResponse.json({ ok: true });
}
