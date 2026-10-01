import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularProjecaoMensal } from "@/lib/metaParceiro";

// Período selecionado via ?mes=YYYY-MM (filtro do dashboard) — sem o
// parâmetro, ou se vier inválido, cai no mês atual (comportamento de sempre).
function resolverPeriodo(mesParam: string | null) {
  const hoje = new Date();
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [ano, mes] = mesParam.split("-").map(Number);
    return { ano, mesIndex: mes - 1 };
  }
  return { ano: hoje.getFullYear(), mesIndex: hoje.getMonth() };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { ano, mesIndex } = resolverPeriodo(searchParams.get("mes"));

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

  const inicioMes = new Date(ano, mesIndex, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const inicioProximoMes = new Date(ano, mesIndex + 1, 1);
  inicioProximoMes.setHours(0, 0, 0, 0);

  const hoje = new Date();
  const ehMesAtual = ano === hoje.getFullYear() && mesIndex === hoje.getMonth();

  const indicacoesMes = indicacoes.filter((i) => {
    const d = new Date(i.data);
    return d >= inicioMes && d < inicioProximoMes;
  });
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

  // Metas de indicação por parceiro (período selecionado) — mesma fórmula usada
  // na ficha do parceiro: indicações = contagem de Indicacao no mês. Metas fixas
  // (contratuais) valem todo mês; se também existir uma específica pro período
  // selecionado, essa tem prioridade.
  const periodoSelecionado = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;
  const metasParceiroMesRaw = await prisma.metaParceiro.findMany({
    where: { tipo: "LEADS_QUALIFICADOS", OR: [{ periodo: periodoSelecionado }, { fixa: true }] },
    include: { partner: { select: { nome: true } } },
  });

  const metaPorPartner = new Map<string, (typeof metasParceiroMesRaw)[number]>();
  for (const m of metasParceiroMesRaw) {
    const atual = metaPorPartner.get(m.partnerId);
    if (!atual || (atual.fixa && m.periodo === periodoSelecionado)) {
      metaPorPartner.set(m.partnerId, m);
    }
  }

  // Pra período passado (já encerrado), a projeção não deve extrapolar — passa
  // o último dia do mês como "hoje" pra calcularProjecaoMensal tratar os 100%
  // dos dias como decorridos, o que faz a projeção virar igual ao realizado.
  const hojeParaProjecao = ehMesAtual ? hoje : new Date(ano, mesIndex + 1, 0);

  const metasParceiroMes = Array.from(metaPorPartner.values())
    .map((m) => {
      const realizado = indicacoes.filter(
        (i) => i.partnerId === m.partnerId && i.data.toISOString().slice(0, 7) === periodoSelecionado
      ).length;
      const projecao = calcularProjecaoMensal(realizado, m.valorMeta, hojeParaProjecao);
      return {
        id: m.id,
        partnerId: m.partnerId,
        partnerNome: m.partner.nome,
        valorMeta: m.valorMeta,
        realizado,
        pct: (realizado / m.valorMeta) * 100,
        projecaoFimMes: projecao.projecaoFimMes,
        pctProjecao: projecao.pctProjecao,
        vaiBaterMeta: projecao.vaiBaterMeta,
      };
    })
    .sort((a, b) => a.pct - b.pct);

  return NextResponse.json({
    periodoSelecionado,
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
