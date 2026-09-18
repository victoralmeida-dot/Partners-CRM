import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const convidado = await prisma.convidadoEvento.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      telefone: body.telefone || null,
      cpf: body.cpf || null,
      email: body.email || null,
      empresa: body.empresa || null,
      faturamento: body.faturamento ?? null,
    },
  });

  await registrarAuditoria(
    "ATUALIZAR",
    "ConvidadoEvento",
    convidado.id,
    `Editou o convidado "${convidado.nome}"`
  );

  return NextResponse.json(convidado);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const convidado = await prisma.convidadoEvento.findUnique({ where: { id: params.id } });
  await prisma.convidadoEvento.delete({ where: { id: params.id } });
  await registrarAuditoria(
    "REMOVER",
    "ConvidadoEvento",
    params.id,
    `Removeu o convidado "${convidado?.nome ?? params.id}"`
  );
  return NextResponse.json({ ok: true });
}
