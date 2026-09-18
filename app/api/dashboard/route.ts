import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [partners, indicacoes, acoesProximas] = await Promise.all([
    prisma.partner.findMany(),
    prisma.indicacao.findMany({ include: { comissao: true, partner: true } }),
    prisma.acao.findMany({
      where: { status: "PLANEJADA" },
      include: { partner: true },
      orderBy: { dataPlanejada: "asc" },
      take: 8,
    }),
  ]);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const indicacoesMes = indicacoes.filter((i) => new Date(i.data) >= inicioMes);
  const convertidas = indicacoes.filter((i) => i.status === "CONVERTIDA");
  const taxaConversao = indicacoes.length > 0 ? convertidas.length / indicacoes.length : 0;

  const comissaoPendente = indicacoes
    .filter((i) => i.comissao && i.comissao.statusPagamento === "PENDENTE")
    .reduce((sum, i) => sum + (i.comissao?.valor ?? 0), 0);

  const comissaoPaga = indicacoes
    .filter((i) => i.comissao && i.comissao.statusPagamento === "PAGO")
    .reduce((sum, i) => sum + (i.comissao?.valor ?? 0), 0);

  // Ranking por número de indicações convertidas
  const porPartner: Record<string, { nome: string; convertidas: number; total: number }> = {};
  for (const i of indicacoes) {
    const key = i.partnerId;
    if (!porPartner[key]) {
      porPartner[key] = { nome: i.partner.nome, convertidas: 0, total: 0 };
    }
    porPartner[key].total += 1;
    if (i.status === "CONVERTIDA") porPartner[key].convertidas += 1;
  }
  const rankingPartners = Object.values(porPartner).sort((a, b) => b.convertidas - a.convertidas);

  const indicacoesRecentesMes = indicacoesMes
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  // Metas de indicação por parceiro (mês atual) — mesma fórmula usada na ficha
  // do parceiro: indicações = contagem de Indicacao no mês. Metas fixas (contratuais)
  // valem todo mês; se também existir uma específica pro mês atual, essa tem prioridade.
  const periodoAtual = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}`;
  const metasParceiroMesRaw = await prisma.metaParceiro.findMany({
    where: { tipo: "LEADS_QUALIFICADOS", OR: [{ periodo: periodoAtual }, { fixa: true }] },
    include: { partner: { select: { nome: true } } },
  });

  const metaPorPartner = new Map<string, (typeof metasParceiroMesRaw)[number]>();
  for (const m of metasParceiroMesRaw) {
    const atual = metaPorPartner.get(m.partnerId);
    if (!atual || (atual.fixa && m.periodo === periodoAtual)) {
      metaPorPartner.set(m.partnerId, m);
    }
  }

  const metasParceiroMes = Array.from(metaPorPartner.values())
    .map((m) => {
      const realizado = indicacoes.filter(
        (i) => i.partnerId === m.partnerId && i.data.toISOString().slice(0, 7) === periodoAtual
      ).length;
      return {
        id: m.id,
        partnerId: m.partnerId,
        partnerNome: m.partner.nome,
        valorMeta: m.valorMeta,
        realizado,
        pct: (realizado / m.valorMeta) * 100,
      };
    })
    .sort((a, b) => a.pct - b.pct);

  return NextResponse.json({
    totalPartners: partners.length,
    partnersPrioritarios: partners.filter((p) => p.prioritario).length,
    indicacoesMes: indicacoesMes.length,
    indicacoesTotal: indicacoes.length,
    indicacoesRecentesMes,
    taxaConversao,
    comissaoPendente,
    comissaoPaga,
    acoesProximas,
    rankingPartners,
    metasParceiroMes,
  });
}
