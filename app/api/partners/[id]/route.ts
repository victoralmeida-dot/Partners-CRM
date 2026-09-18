import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const partner = await prisma.partner.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    include: {
      indicacoes: { include: { comissao: true }, orderBy: { data: "desc" } },
      acoes: { orderBy: { dataPlanejada: "asc" } },
      eventos: {
        include: { evento: true, convidados: { orderBy: { createdAt: "asc" } } },
        orderBy: { evento: { data: "desc" } },
      },
      metas: { orderBy: [{ periodo: "asc" }, { tipo: "asc" }] },
      onboarding: { orderBy: { ordem: "asc" } },
    },
  });

  if (!partner) {
    return NextResponse.json({ error: "Partner não encontrado." }, { status: 404 });
  }

  return NextResponse.json(partner);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const partner = await prisma.partner.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      tier: body.tier,
      status: body.status,
      categoria: body.categoria,
      prioritario: body.prioritario,
      mantenedor: body.mantenedor,
      cotaEventosContratados: body.cotaEventosContratados,
      icpFaturamentoMin: body.icpFaturamentoMin,
      icpFaturamentoMax: body.icpFaturamentoMax,
      icpPedidosMin: body.icpPedidosMin,
      icpSegmento: body.icpSegmento,
      icpCaracteristicas: body.icpCaracteristicas,
      contatoPrincipal: body.contatoPrincipal,
      contatoEmail: body.contatoEmail,
      contatoSecund: body.contatoSecund,
      observacoes: body.observacoes,
      clickupCardId: body.clickupCardId,
    },
  });

  await registrarAuditoria("ATUALIZAR", "Partner", partner.id, `Editou o parceiro "${partner.nome}"`);

  return NextResponse.json(partner);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const partner = await prisma.partner.findUnique({ where: { id: params.id } });
  await prisma.partner.delete({ where: { id: params.id } });
  await registrarAuditoria("REMOVER", "Partner", params.id, `Removeu o parceiro "${partner?.nome ?? params.id}"`);
  return NextResponse.json({ ok: true });
}
