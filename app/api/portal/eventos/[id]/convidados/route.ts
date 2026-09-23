import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

// Parceiro envia um convidado pro evento que ele já aceitou. partnerId vem só
// da sessão (mesma regra do resto do Portal) — a participação é conferida
// contra esse partnerId, e só aceita convidado se o evento já estiver
// PLANEJADO (convite aceito), nunca enquanto ainda é CONVITE_ENVIADO.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const partnerId = (session?.user as any)?.partnerId as string | undefined;

  if (!session?.user || !partnerId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const participacao = await prisma.participacaoEvento.findUnique({
    where: { id: params.id },
    include: { evento: true },
  });

  if (!participacao || participacao.partnerId !== partnerId) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  if (participacao.status !== "PLANEJADO") {
    return NextResponse.json(
      { error: "Só é possível enviar convidados pra eventos já aceitos." },
      { status: 400 }
    );
  }

  const body = await req.json();
  if (!body.nome) {
    return NextResponse.json({ error: "nome é obrigatório." }, { status: 400 });
  }

  const convidado = await prisma.convidadoEvento.create({
    data: {
      participacaoEventoId: participacao.id,
      nome: body.nome,
      telefone: body.telefone || null,
      cpf: body.cpf || null,
      email: body.email || null,
      empresa: body.empresa || null,
      faturamento: body.faturamento ?? null,
      status: "PENDENTE",
    },
  });

  await registrarAuditoria(
    "CRIAR",
    "ConvidadoEvento",
    convidado.id,
    `Parceiro enviou o convidado "${convidado.nome}" pro evento "${participacao.evento.nome}"`
  );

  return NextResponse.json(convidado, { status: 201 });
}
