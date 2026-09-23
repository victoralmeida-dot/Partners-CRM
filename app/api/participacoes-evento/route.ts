import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET() {
  const participacoes = await prisma.participacaoEvento.findMany({
    include: { partner: true, evento: true, convidados: { orderBy: { createdAt: "asc" } } },
    orderBy: { evento: { data: "desc" } },
  });
  return NextResponse.json(participacoes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.partnerId || !body.eventoId) {
    return NextResponse.json(
      { error: "partnerId e eventoId são obrigatórios." },
      { status: 400 }
    );
  }

  const participacao = await prisma.participacaoEvento.create({
    data: {
      partnerId: body.partnerId,
      eventoId: body.eventoId,
      status: body.status ?? "PLANEJADO",
      participacaoPalco: body.participacaoPalco ?? false,
      quemParticipou: body.quemParticipou ?? null,
      participacaoPlateia: body.participacaoPlateia ?? false,
      conteudoPalestra: body.conteudoPalestra ?? null,
      mailingEnviado: body.mailingEnviado ?? false,
      mailingData: body.mailingData ? new Date(body.mailingData) : null,
    },
    include: { evento: true, partner: true },
  });

  await registrarAuditoria(
    "CRIAR",
    "ParticipacaoEvento",
    participacao.id,
    participacao.status === "CONVITE_ENVIADO"
      ? `Convidou "${participacao.partner.nome}" pro evento "${participacao.evento.nome}"`
      : `Adicionou "${participacao.partner.nome}" ao evento "${participacao.evento.nome}" (status ${participacao.status})`
  );

  return NextResponse.json(participacao, { status: 201 });
}
