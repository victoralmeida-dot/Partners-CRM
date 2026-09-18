import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.participacaoEventoId || !body.nome) {
    return NextResponse.json(
      { error: "participacaoEventoId e nome são obrigatórios." },
      { status: 400 }
    );
  }

  const convidado = await prisma.convidadoEvento.create({
    data: {
      participacaoEventoId: body.participacaoEventoId,
      nome: body.nome,
      telefone: body.telefone || null,
      cpf: body.cpf || null,
      email: body.email || null,
      empresa: body.empresa || null,
      faturamento: body.faturamento ?? null,
    },
  });

  await registrarAuditoria(
    "CRIAR",
    "ConvidadoEvento",
    convidado.id,
    `Novo convidado "${convidado.nome}" registrado em evento`
  );

  return NextResponse.json(convidado, { status: 201 });
}
