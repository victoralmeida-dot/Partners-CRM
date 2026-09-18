import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Dados reais extraídos do ClickUp (lista "Cards", status "ativos" e "mantenedores")
// em 01/07/2026 — os 21 parceiros nesses dois status. Ajuste tier e categoria
// conforme sua própria categorização; contatos e observações vieram direto do
// campo de cada card.
async function main() {
  const count = await prisma.partner.count();
  if (count > 0) {
    console.log("Já existem partners no banco — seed de partners ignorado (metas serão aplicadas mesmo assim).");
  } else {

  const partners = [
    // ---- MANTENEDORES ----
    {
      nome: "Vettrus",
      tier: "GOLD",
      status: "ATIVO",
      mantenedor: true,
      prioritario: true,
      categoria: "Consultoria de Importação",
      contatoPrincipal: "Paulo Buono",
      contatoEmail: "diretoria@vettrus.com.br",
      contatoSecund: "+55 13 97420 8992",
      observacoes:
        "Fixo R$ 20.000/mês + comissão por indicação (R$ 2.000 Eng. de Importação, R$ 1.000 Outsourcing, 10% demais contratos até 12 meses).",
      clickupCardId: "86ah4x77u",
    },
    {
      nome: "Olist",
      tier: "GOLD",
      status: "ATIVO",
      mantenedor: true,
      prioritario: true,
      cotaEventosContratados: 18,
      categoria: "Marketplace / Gestão",
      contatoPrincipal: "Kendra Alves",
      contatoSecund: "+55 41 9992 7307",
      observacoes:
        "Olist Tiny Tecnologia. Fixo R$ 20.000/mês + Bônus/20% em 12 meses. Mantenedora em 18 eventos, 16 vídeos YouTube, 48 stories, 12 reels.",
      clickupCardId: "86a6ztpwg",
    },
    {
      nome: "GoBots",
      tier: "GOLD",
      status: "ATIVO",
      mantenedor: true,
      prioritario: true,
      cotaEventosContratados: 16,
      icpFaturamentoMin: 100000,
      icpCaracteristicas:
        "Pelo menos 10 perguntas/dia recebidas de clientes (volume mínimo pro chatbot fazer sentido).",
      categoria: "Automação / IA para sellers",
      contatoPrincipal: "Zé Luiz",
      contatoEmail: "jose.parrode@gobots.com",
      observacoes:
        "Contrato total R$ 507.135 (2 anos). Ano 1: 12x R$ 25.356,80. Comissão 15% sobre MRR por até 12 meses/cliente.",
      clickupCardId: "86agbpfa3",
    },
    {
      nome: "Joom Pulse",
      tier: "GOLD",
      status: "ATIVO",
      mantenedor: true,
      prioritario: true,
      categoria: "Inteligência de Mercado (Mercado Livre)",
      contatoPrincipal: "Gabriel",
      contatoEmail: "info@joompulse.com",
      contatoSecund: "+55 21 99973 6643",
      observacoes:
        "Fixo R$ 33.000/mês, comissão 20% em 12 meses. Cupom ECOMMERCEPURO20. Embaixador: Gabriel Bollico.",
      clickupCardId: "86a6ztppd",
    },
    {
      nome: "Base",
      tier: "SILVER",
      status: "ATIVO",
      mantenedor: true,
      prioritario: false,
      icpFaturamentoMin: 800000,
      icpCaracteristicas:
        "Critério OR: faturamento > R$800k/mês OU mais de 3.000 pedidos/mês. Também aceita clientes a partir de 1.000 pedidos/mês.",
      categoria: "Gestão de E-commerce (BaseLinker)",
      contatoPrincipal: "Luiz Felipe Debize",
      observacoes:
        "BaseLinker Advisory Brazil. Fixo R$ 40.000/mês, comissão 20% em 12 meses. Cupom com trial + implementação gratuita.",
      clickupCardId: "86a6ztpxr",
    },
    {
      nome: "Nuvemshop",
      tier: "SILVER",
      status: "ATIVO",
      mantenedor: true,
      prioritario: false,
      categoria: "Plataforma de Loja Virtual",
      contatoPrincipal: "Luiz Natal",
      contatoSecund: "+55 41 99207 1244",
      observacoes:
        "Fixo R$ 20.000/mês. Comissão: bônus por loja + 10% MRR. Contato secundário: Gislainy +55 11 95201-4427.",
      clickupCardId: "86aeu76mw",
    },
    {
      nome: "GE Finance",
      tier: "SILVER",
      status: "ATIVO",
      mantenedor: true,
      prioritario: false,
      icpFaturamentoMin: 250000,
      icpSegmento: "Marketplaces (1 ou mais lojas)",
      icpCaracteristicas:
        "Prioridade pra quem fatura acima de R$250-300k/mês. Foco em marketplaces (não só loja virtual própria). Módulo de crédito tributário é forte diferencial pra clientes no regime normal de tributação.",
      categoria: "Financeiro / M&A",
      contatoPrincipal: "Gustavo Lopes Camargo",
      contatoEmail: "gustavo@gestaoecommerce.com.br",
      observacoes:
        "Modelo Media for Equity: 10% de participação societária se atingir meta de MRR até 30/06/2026, ou % proporcional. Mantém 10% de comissão mensal por 3 anos.",
      clickupCardId: "86a6ztqat",
    },

    // ---- ATIVOS ----
    {
      nome: "Santander",
      tier: "GOLD",
      status: "ATIVO",
      prioritario: true,
      categoria: "Financeiro",
      observacoes:
        "Campanha exclusiva no segmento financeiro: 5 Reels em collab, reposts, combos de stories. Contrato de R$ 99.000.",
      clickupCardId: "86ahhg63q",
    },
    {
      nome: "GS1",
      tier: "GOLD",
      status: "ATIVO",
      prioritario: true,
      categoria: "Automação / Cadastro de Produtos",
      contatoEmail: "compras@gs1br.org",
      observacoes:
        "GS1 Brasil. Contrato de R$ 96.000 em 8 parcelas (mai-dez/2026): reels, stories, evento patrocinado e visita guiada.",
      clickupCardId: "86ah4xp1u",
    },
    {
      nome: "Smart Online",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: true,
      categoria: "Tecnologia / Eventos",
      contatoPrincipal: "Thiago Villa",
      contatoEmail: "thiago.villa@smartonline.app",
      observacoes:
        "Patrocínio de 3 eventos (Tributário, Imersão Financeira, Importação Pura). Total R$ 45.000 em 2 parcelas.",
      clickupCardId: "86ah8ycjd",
    },
    {
      nome: "Stockfy",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: true,
      icpFaturamentoMin: 1000000,
      icpSegmento: "Marketplaces, com armazenagem própria",
      icpCaracteristicas:
        "Sellers com volume suficiente pra sentir a dor da gestão manual (hoje usam planilha/papel). Critérios: 80+ pedidos/dia, área de operação 1.000m²+. Quem decide: líder de operação, gerente de operação ou dono do negócio. Fora do ICP: dropshipping, crossdocking e sellers sem armazenagem própria.",
      categoria: "Gestão de Estoque (WMS)",
      contatoPrincipal: "Natalia Soares Cassol",
      contatoEmail: "natalia@stockfylog.com",
      observacoes:
        "Fixo R$ 7.500/mês (6 parcelas). Comissão de 10% a 20% sobre MRR conforme volume de clientes indicados.",
      clickupCardId: "86aj119wb",
    },
    {
      nome: "Flowbiz",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: true,
      icpFaturamentoMin: 100000,
      icpFaturamentoMax: 300000,
      icpSegmento: "Marca própria",
      categoria: "CRM / Automação de Marketing",
      contatoPrincipal: "Vinícius de Souza Correa",
      contatoEmail: "vinicius@mailbiz.com.br",
      observacoes:
        "Patrocínio de 3 edições do evento Marca de Valor. Fixo R$ 7.500/mês, comissão 10% lifetime.",
      clickupCardId: "86ahhg5r7",
    },
    {
      nome: "Caique Parça",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: true,
      categoria: "Marketing de Influência",
      contatoPrincipal: "Caique Tenório Moraes",
      contatoEmail: "caique.parca@grupo-brava.com",
      observacoes:
        "Gestão de influencers. Comissão de 25% sobre Receita Líquida dos clientes indicados, por até 24 meses.",
      clickupCardId: "86ahhg5tk",
    },
    {
      nome: "Clara",
      tier: "BRONZE",
      status: "ATIVO",
      prioritario: true,
      categoria: "Cartão Corporativo / Fintech",
      contatoEmail: "layon.costa@clara.team",
      observacoes:
        "Cartão de crédito empresarial sem anuidade. Comissão de 0,15% a 0,35% sobre TPV, por 12 meses.",
      clickupCardId: "86ahjryqu",
    },
    {
      nome: "EWZ | BTG Pactual",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: false,
      categoria: "Assessoria de Investimentos",
      contatoPrincipal: "Lucas Carvalho",
      contatoSecund: "+55 11 99334 6574",
      observacoes:
        "EWZ Capital (BTG Pactual). Comissão de 20% sobre repasse de investimentos indicados (15% renda variável) + 20% sobre outros produtos financeiros.",
      clickupCardId: "86ag9yhrh",
    },
    {
      nome: "Avantpro",
      tier: "BRONZE",
      status: "ATIVO",
      prioritario: false,
      categoria: "Software de Gestão",
      contatoPrincipal: "Lucimara",
      contatoSecund: "+55 19 99397 8295",
      observacoes: "Cupom ECOMMERCEPURO: 10% de desconto em todos os planos. Comissão 20% nos primeiros 12 meses.",
      clickupCardId: "86a73rhvn",
    },
    {
      nome: "Shopee",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: false,
      categoria: "Marketplace",
      contatoPrincipal: "Iza",
      contatoSecund: "(11) 97826-7726",
      observacoes: "Comissão de 20% em 12 meses.",
      clickupCardId: "86a73bb00",
    },
    {
      nome: "Radar Scout",
      tier: "BRONZE",
      status: "ATIVO",
      prioritario: false,
      categoria: "Inteligência de Mercado",
      contatoPrincipal: "Raphael França",
      contatoSecund: "(61) 98502-5464",
      observacoes:
        "Bônus por faixa de ativações: de R$ 500/mês (15-29 ativações) até R$ 15.000/mês (250+ ativações).",
      clickupCardId: "86a6ztq6v",
    },
    {
      nome: "AdMan",
      tier: "BRONZE",
      status: "ATIVO",
      prioritario: false,
      categoria: "Publicidade / Ads",
      observacoes: "1 vídeo (Reels/YouTube) a cada 60 dias + 1 menção em Stories a cada 15 dias.",
      clickupCardId: "86a6ztpzz",
    },
    {
      nome: "Meli Ads",
      tier: "BRONZE",
      status: "ATIVO",
      prioritario: false,
      categoria: "Publicidade (Mercado Livre)",
      observacoes: "Comissão de US$ 60 por participante. Sem contato registrado ainda no ClickUp.",
      clickupCardId: "86aghbgb7",
    },
    {
      nome: "Dasi - Fernando e Eduardo",
      tier: "SILVER",
      status: "ATIVO",
      prioritario: false,
      categoria: "Palestrantes / Conteúdo",
      contatoPrincipal: "Fernando Rosa Dasi / Eduardo Rosa Dasi",
      contatoEmail: "fernando@dasi.com.br",
      observacoes:
        "Palestrantes da Imersão Marca de Valor. Doação de R$ 80.000 a ONG (não é remuneração direta), 3 edições em 12 meses.",
      clickupCardId: "86aj50pba",
    },
  ];

  for (const p of partners) {
    await prisma.partner.create({ data: p });
  }

  // Histórico real de eventos da Olist (extraído da planilha de controle) —
  // já entra populado pra você ver o recurso de "cota x realizado" funcionando.
  const olist = await prisma.partner.findFirst({ where: { nome: "Olist" } });
  if (olist) {
    const eventosOlist = [
      { evento: "Imersão Financeira", data: "2026-02-10", participacaoPalco: true, quemParticipou: "Daniel Bueno", valorEvento: 6000 },
      { evento: "Importação Pura", data: "2026-02-24", participacaoPalco: false, valorEvento: 15000 },
      { evento: "Imersão Financeira", data: "2026-04-06", participacaoPalco: false, valorEvento: 6000 },
      { evento: "Importação Pura", data: "2026-04-08", participacaoPalco: false, valorEvento: 15000 },
      { evento: "Performance Shopee", data: "2026-04-23", participacaoPalco: false, valorEvento: 6000 },
      { evento: "Imersão Tributária", data: "2026-05-12", participacaoPalco: false, valorEvento: 6000 },
      { evento: "Performance Meli", data: "2026-05-20", participacaoPalco: false, valorEvento: 7500 },
      { evento: "Inteligência Artificial", data: "2026-05-27", participacaoPalco: true, quemParticipou: "Mari Dalvi", valorEvento: 6000 },
      { evento: "Imersão Financeira", data: "2026-06-10", participacaoPalco: true, quemParticipou: "Giu Gargione", valorEvento: 6000 },
      { evento: "Imersão Marca de Valor", data: "2026-06-25", participacaoPalco: false, valorEvento: 10000 },
    ];
    const catalogoPorNome = new Map<string, string>();
    for (const ev of eventosOlist) {
      let eventoId = catalogoPorNome.get(ev.evento);
      if (!eventoId) {
        const dataMaisAntiga = eventosOlist
          .filter((e) => e.evento === ev.evento)
          .reduce((min, e) => (e.data < min ? e.data : min), ev.data);
        const criado = await prisma.evento.create({
          data: { nome: ev.evento, data: new Date(dataMaisAntiga) },
        });
        eventoId = criado.id;
        catalogoPorNome.set(ev.evento, eventoId);
      }
      await prisma.participacaoEvento.create({
        data: {
          partnerId: olist.id,
          eventoId,
          status: "REALIZADO",
          participacaoPalco: ev.participacaoPalco,
          quemParticipou: ev.quemParticipou ?? null,
          participacaoPlateia: false,
          valorEvento: ev.valorEvento,
        },
      });
    }
  }

  console.log(`Seed concluído: ${partners.length} partners criados (dados reais do ClickUp).`);
  } // fim do bloco "else" (seed de partners só roda se o banco estava vazio)

  // Metas de Q3/2026 — sempre aplicadas via upsert, mesmo que os partners já existam.
  const metas = [
    { periodo: "2026-07", tipo: "MENSAL", valorMeta: 527000 },
    { periodo: "2026-08", tipo: "MENSAL", valorMeta: 538000 },
    { periodo: "2026-09", tipo: "MENSAL", valorMeta: 557000 },
    { periodo: "2026-Q3", tipo: "TRIMESTRAL", valorMeta: 1620000 },
  ];
  for (const m of metas) {
    await prisma.meta.upsert({
      where: { periodo: m.periodo },
      create: m,
      update: { valorMeta: m.valorMeta, tipo: m.tipo },
    });
  }
  console.log("Metas do Q3/2026 aplicadas (julho, agosto, setembro e trimestral).");

  // Usuário admin inicial — sempre garantido, mesmo em bancos já existentes.
  // TROQUE ESSA SENHA no primeiro acesso, em "Meu perfil".
  const senhaAdminPadrao = "trocar123";
  const existeAdmin = await prisma.user.findUnique({ where: { email: "victor@ecommercepuro.com.br" } });
  if (!existeAdmin) {
    await prisma.user.create({
      data: {
        email: "victor@ecommercepuro.com.br",
        senhaHash: await bcrypt.hash(senhaAdminPadrao, 10),
        nome: "Victor Almeida",
        role: "ADMIN",
      },
    });
    console.log(
      `Usuário admin criado: victor@ecommercepuro.com.br / senha provisória "${senhaAdminPadrao}" — TROQUE ISSO.`
    );
  }

  // Meta por parceiro — exemplo real da Vettrus (contrato, 13/07/2026).
  const vettrus = await prisma.partner.findFirst({ where: { nome: "Vettrus" } });
  if (vettrus) {
    const metasVettrus = [
      { tipo: "LEADS_QUALIFICADOS", periodo: "2026-07", valorMeta: 20 },
      { tipo: "REUNIOES_COMERCIAIS", periodo: "2026-07", valorMeta: 10 },
    ];
    for (const m of metasVettrus) {
      await prisma.metaParceiro.upsert({
        where: { partnerId_tipo_periodo: { partnerId: vettrus.id, tipo: m.tipo, periodo: m.periodo } },
        create: { partnerId: vettrus.id, ...m },
        update: { valorMeta: m.valorMeta },
      });
    }
    console.log("Metas da Vettrus (Julho/2026) aplicadas.");
  }

  // Tiers padrão — sempre garantidos via upsert, com sugestão de descrição
  // baseada no perfil real dos parceiros já cadastrados.
  const tiersDefault = [
    {
      nome: "Gold",
      ordem: 3,
      descricao:
        "Fixo mensal alto (R$20k+/mês) ou cota de eventos ampla. Parceiro estratégico institucional — geralmente tem presença de palco garantida, promoção na base de clientes da EP e regras de comissão bem definidas. Ex: Vettrus, Olist, GoBots, Joom Pulse, Santander, GS1.",
    },
    {
      nome: "Silver",
      ordem: 2,
      descricao:
        "Fixo mensal moderado (R$7k-20k) ou comissão relevante sem fixo alto. Compromisso de entregas pontual (participação em eventos específicos, patrocínios), sem a mesma cadência institucional do Gold. Ex: Stockfy, Flowbiz, Smart Online, Base, Nuvemshop, GE Finance.",
    },
    {
      nome: "Bronze",
      ordem: 1,
      descricao:
        "Sem fixo mensal — parceria via comissão/cupom ou pontual. Menor compromisso contratual, mas ainda estratégico pra ampliar a rede de indicações. Ex: Clara, Avantpro, AdMan, Meli Ads, Radar Scout.",
    },
  ];
  for (const t of tiersDefault) {
    const existe = await prisma.tier.findUnique({ where: { nome: t.nome } });
    if (!existe) {
      await prisma.tier.create({ data: t });
    }
  }
  console.log("Tiers padrão (Gold/Silver/Bronze) aplicados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
