import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

// Status que usam o campo revisitarEm pra lembrete de retomar contato — ao
// entrar num desses sem revisita já marcada, sugere daqui a 30 dias. Regra
// centralizada aqui (backend) pra valer igual não importa de onde o status
// foi alterado (Kanban de /indicacoes ou ficha do parceiro).
const STATUS_COM_REVISITA = ["EM_ESPERA", "LEAD_POTENCIAL"];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  let revisitarEm =
    body.revisitarEm !== undefined ? (body.revisitarEm ? new Date(body.revisitarEm) : null) : undefined;

  if (body.status && STATUS_COM_REVISITA.includes(body.status) && revisitarEm === undefined) {
    const atual = await prisma.indicacao.findUnique({
      where: { id: params.id },
      select: { revisitarEm: true },
    });
    if (!atual?.revisitarEm) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      revisitarEm = d;
    }
  }

  const indicacao = await prisma.indicacao.update({
    where: { id: params.id },
    data: {
      leadNome: body.leadNome,
      origem: body.origem,
      telefone: body.telefone,
      email: body.email,
      cnpj: body.cnpj,
      faturamento: body.faturamento,
      quemIndicou: body.quemIndicou,
      status: body.status,
      revisitarEm,
      valorEstimado: body.valorEstimado,
      observacoes: body.observacoes,
    },
  });

  if (body.status) {
    await registrarAuditoria(
      "ATUALIZAR",
      "Indicacao",
      indicacao.id,
      `Status de "${indicacao.leadNome}" mudou para ${body.status}`
    );
  }

  // Se vier bloco de comissão, faz upsert (cria se não existir, atualiza se existir)
  if (body.comissao) {
    await prisma.comissao.upsert({
      where: { indicacaoId: params.id },
      create: {
        indicacaoId: params.id,
        valor: body.comissao.valor,
        tipo: body.comissao.tipo ?? "PERCENTUAL",
        statusPagamento: body.comissao.statusPagamento ?? "PENDENTE",
        dataPagamento: body.comissao.dataPagamento ? new Date(body.comissao.dataPagamento) : null,
      },
      update: {
        valor: body.comissao.valor,
        tipo: body.comissao.tipo,
        statusPagamento: body.comissao.statusPagamento,
        dataPagamento: body.comissao.dataPagamento ? new Date(body.comissao.dataPagamento) : null,
      },
    });
    await registrarAuditoria(
      "ATUALIZAR",
      "Comissao",
      params.id,
      `Comissão de "${indicacao.leadNome}" — valor ${body.comissao.valor} (${body.comissao.statusPagamento ?? "PENDENTE"})`
    );
  }

  // Permite desfazer uma comissão marcada por engano — remove o registro
  // por completo, voltando pro estado "sem comissão definida".
  if (body.removerComissao) {
    await prisma.comissao.deleteMany({ where: { indicacaoId: params.id } });
    await registrarAuditoria(
      "REMOVER",
      "Comissao",
      params.id,
      `Removeu a comissão de "${indicacao.leadNome}"`
    );
  }

  const updated = await prisma.indicacao.findUnique({
    where: { id: params.id },
    include: { comissao: true, partner: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const indicacao = await prisma.indicacao.findUnique({ where: { id: params.id } });
  await prisma.indicacao.delete({ where: { id: params.id } });
  await registrarAuditoria(
    "REMOVER",
    "Indicacao",
    params.id,
    `Removeu a indicação "${indicacao?.leadNome ?? params.id}"`
  );
  return NextResponse.json({ ok: true });
}
