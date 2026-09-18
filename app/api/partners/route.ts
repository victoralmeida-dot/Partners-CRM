import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { criarChecklistOnboarding } from "@/lib/onboarding";
import { gerarSlugUnico } from "@/lib/slug";

export async function GET() {
  const partners = await prisma.partner.findMany({
    orderBy: [{ prioritario: "desc" }, { nome: "asc" }],
    include: {
      indicacoes: { include: { comissao: true } },
      acoes: true,
      eventos: true,
      onboarding: true,
    },
  });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nome) {
    return NextResponse.json({ error: "Nome do partner é obrigatório." }, { status: 400 });
  }

  const slug = await gerarSlugUnico(body.nome);

  const partner = await prisma.partner.create({
    data: {
      nome: body.nome,
      slug,
      tier: body.tier ?? "BRONZE",
      status: body.status ?? "EM_ATIVACAO",
      categoria: body.categoria ?? null,
      prioritario: body.prioritario ?? false,
      mantenedor: body.mantenedor ?? false,
      cotaEventosContratados: body.cotaEventosContratados ?? null,
      icpFaturamentoMin: body.icpFaturamentoMin ?? null,
      icpFaturamentoMax: body.icpFaturamentoMax ?? null,
      icpPedidosMin: body.icpPedidosMin ?? null,
      icpSegmento: body.icpSegmento ?? null,
      icpCaracteristicas: body.icpCaracteristicas ?? null,
      contatoPrincipal: body.contatoPrincipal ?? null,
      contatoEmail: body.contatoEmail ?? null,
      contatoSecund: body.contatoSecund ?? null,
      observacoes: body.observacoes ?? null,
      clickupCardId: body.clickupCardId ?? null,
    },
  });

  await criarChecklistOnboarding(partner.id);
  await registrarAuditoria("CRIAR", "Partner", partner.id, `Criou o parceiro "${partner.nome}"`);

  return NextResponse.json(partner, { status: 201 });
}
