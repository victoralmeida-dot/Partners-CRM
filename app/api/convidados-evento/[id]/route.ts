import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  // Endpoint compartilhado entre o form de edição comum (nome/telefone/etc,
  // sempre manda tudo) e a ação de aprovar/rejeitar (app/eventos/page.tsx,
  // manda só status/motivoRejeicao) — por isso cada campo só entra no update
  // quando vem preenchido no body; senão, um approve/reject zeraria os outros
  // campos do convidado (undefined || null vira null se não checar assim).
  const convidado = await prisma.convidadoEvento.update({
    where: { id: params.id },
    data: {
      nome: body.nome !== undefined ? body.nome : undefined,
      telefone: body.telefone !== undefined ? body.telefone || null : undefined,
      cpf: body.cpf !== undefined ? body.cpf || null : undefined,
      email: body.email !== undefined ? body.email || null : undefined,
      empresa: body.empresa !== undefined ? body.empresa || null : undefined,
      faturamento: body.faturamento !== undefined ? body.faturamento ?? null : undefined,
      status: body.status !== undefined ? body.status : undefined,
      motivoRejeicao: body.motivoRejeicao !== undefined ? body.motivoRejeicao : undefined,
    },
  });

  let detalhe = `Editou o convidado "${convidado.nome}"`;
  if (body.status === "APROVADO") {
    detalhe = `Aprovou o convidado "${convidado.nome}"`;
  } else if (body.status === "REJEITADO") {
    detalhe = `Rejeitou o convidado "${convidado.nome}" (motivo: ${body.motivoRejeicao ?? ""})`;
  }

  await registrarAuditoria("ATUALIZAR", "ConvidadoEvento", convidado.id, detalhe);

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
