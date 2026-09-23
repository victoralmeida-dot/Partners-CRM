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

  // Lançado direto pelo admin (não veio do fluxo de convite do Portal do
  // Parceiro) — já nasce APROVADO, sem precisar passar pela fila de aprovação
  // (ver docs/decisoes.md sobre a extensão do ConvidadoEvento com status).
  const convidado = await prisma.convidadoEvento.create({
    data: {
      participacaoEventoId: body.participacaoEventoId,
      nome: body.nome,
      telefone: body.telefone || null,
      cpf: body.cpf || null,
      email: body.email || null,
      empresa: body.empresa || null,
      faturamento: body.faturamento ?? null,
      status: "APROVADO",
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
