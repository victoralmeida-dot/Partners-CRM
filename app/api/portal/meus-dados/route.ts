import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularProjecaoMensal } from "@/lib/metaParceiro";

// O partnerId vem sempre da sessão do usuário logado, nunca de parâmetro de
// URL — é o que impede um usuário PARCEIRO de puxar dado de outro parceiro
// trocando um id manualmente. Reforçado aqui mesmo, não só no middleware.
export async function GET() {
  const session = await getServerSession(authOptions);
  const partnerId = (session?.user as any)?.partnerId as string | undefined;

  if (!session?.user || !partnerId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, nome: true },
  });

  if (!partner) {
    return NextResponse.json({ error: "Parceiro não encontrado." }, { status: 404 });
  }

  const [indicacoes, participacoes] = await Promise.all([
    prisma.indicacao.findMany({
      where: { partnerId },
      select: {
        id: true,
        leadNome: true,
        status: true,
        data: true,
        comissao: { select: { valor: true, tipo: true, statusPagamento: true } },
      },
      orderBy: { data: "desc" },
    }),
    prisma.participacaoEvento.findMany({
      where: { partnerId },
      select: {
        id: true,
        status: true,
        participacaoPalco: true,
        evento: { select: { nome: true, data: true } },
        convidados: {
          select: { id: true, nome: true, status: true, motivoRejeicao: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { evento: { data: "desc" } },
    }),
  ]);

  // Mesma fórmula de meta/projeção do dashboard interno (lib/metaParceiro.ts)
  // e mesma regra de desempate entre meta fixa (contratual) e meta específica
  // do mês (ver app/api/dashboard/route.ts) — só que restrita a este parceiro.
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const periodoAtual = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}`;

  const metasRaw = await prisma.metaParceiro.findMany({
    where: { partnerId, tipo: "LEADS_QUALIFICADOS", OR: [{ periodo: periodoAtual }, { fixa: true }] },
  });

  let metaEscolhida: (typeof metasRaw)[number] | undefined;
  for (const m of metasRaw) {
    if (!metaEscolhida || (metaEscolhida.fixa && m.periodo === periodoAtual)) {
      metaEscolhida = m;
    }
  }

  let meta = null;
  if (metaEscolhida) {
    const realizado = indicacoes.filter(
      (i) => i.data.toISOString().slice(0, 7) === periodoAtual
    ).length;
    const projecao = calcularProjecaoMensal(realizado, metaEscolhida.valorMeta);
    meta = {
      valorMeta: metaEscolhida.valorMeta,
      realizado,
      pct: (realizado / metaEscolhida.valorMeta) * 100,
      projecaoFimMes: projecao.projecaoFimMes,
      pctProjecao: projecao.pctProjecao,
      vaiBaterMeta: projecao.vaiBaterMeta,
    };
  }

  return NextResponse.json({
    partner: { nome: partner.nome },
    indicacoes: indicacoes.map((i) => ({
      id: i.id,
      leadNome: i.leadNome,
      status: i.status,
      data: i.data,
    })),
    comissoes: indicacoes
      .filter((i) => i.comissao)
      .map((i) => ({
        id: i.id,
        leadNome: i.leadNome,
        valor: i.comissao!.valor,
        tipo: i.comissao!.tipo,
        statusPagamento: i.comissao!.statusPagamento,
      })),
    eventos: participacoes.map((p) => ({
      id: p.id,
      nome: p.evento.nome,
      data: p.evento.data,
      status: p.status,
      participacaoPalco: p.participacaoPalco,
      convidados: p.convidados,
    })),
    meta,
  });
}
