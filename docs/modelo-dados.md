# Modelo de dados

Referência completa do `prisma/schema.prisma`: o que cada model representa, como se relacionam, e por que alguns campos existem. O `CLAUDE.md` tem a versão resumida (uma linha por model) — aqui vai o "porquê".

Para o raciocínio por trás de escolhas de modelagem específicas (por que isso é tabela e não campo, por que isso foi adicionado), ver [decisoes.md](decisoes.md).

## Visão geral das relações

```
Partner ──┬── Indicacao ──┬── Comissao (1:1)
          │               └── NotaIndicacao (1:N)
          ├── Acao
          ├── ParticipacaoEvento ──┬── Evento (N:1, catálogo)
          │                        └── ConvidadoEvento (1:N)
          ├── Receita
          ├── MetaParceiro
          └── OnboardingItem

User ── (opcional) → Partner   (quando role = PARCEIRO)
Tier, Consultor → cadastros auxiliares, referenciados por nome/string
Meta → independente de Partner (meta da empresa como um todo)
AuditLog → registra ações sobre qualquer entidade, sem FK real
```

## Partner

Parceiro de negócio (o "cliente" do CRM). Campos principais:
- `slug` — usado na URL (`/partners/[slug]`) em vez do `id` cru, gerado a partir do nome (ver `lib/slug.ts`). Nunca trocar de volta pra rota por `id`.
- `tier` — string livre que referencia `Tier.nome` (não é FK — ver seção Tier).
- ICP (`icpFaturamentoMin/Max`, `icpPedidosMin`, `icpSegmento`, `icpCaracteristicas`) — perfil de cliente ideal, usado pra cruzar com a carteira e sugerir indicações mais assertivas. `icpPedidosMin` (volume mínimo de pedidos/mês) é campo próprio desde 16/09/2026 porque recorre em vários parceiros (WMS, ERP) de forma independente do faturamento — nem todo ICP qualifica por faturamento, alguns qualificam por volume.
- `mantenedor` — tag independente do `status`; um parceiro pode estar `PAUSADO` e ainda ser mantenedor.
- `cotaEventosContratados` — quantos eventos o contrato prevê, comparado contra a contagem real de `ParticipacaoEvento`.

## Indicacao

Indicação de cliente/mentorado pra um parceiro (ou do parceiro pra EP — ver `origem`).
- `quemIndicou` é uma **string solta**, não FK pra `Consultor` — permite indicação sem consultor cadastrado.
- `status` tem um funil específico: `LEAD_POTENCIAL → ENVIADA → NEGOCIACAO → EM_ESPERA → CONVERTIDA/PERDIDA`.
- `revisitarEm` só é relevante quando o status é `EM_ESPERA` ou `LEAD_POTENCIAL` — data prevista pra retomar contato.

## NotaIndicacao

Histórico de acompanhamento em texto livre, preso a uma `Indicacao`. Existe pra registrar follow-ups sem precisar sobrescrever o campo `observacoes` (que é único, não uma lista).

## Comissao

1:1 com `Indicacao` (uma indicação gera no máximo uma comissão). `tipo` (percentual/fixo) e `statusPagamento` (pendente/pago) são strings, não enum (ver Padrão importante no `CLAUDE.md`).

## Acao

Cronograma/follow-up por parceiro — reunião, evento, ativação, etc. Não confundir com `ParticipacaoEvento`: `Acao` é genérico (qualquer tipo de compromisso), `ParticipacaoEvento` é especificamente presença num evento do catálogo.

## EventoSerie / Evento / ParticipacaoEvento / ConvidadoEvento

- `EventoSerie` (adicionado em 16/09/2026) — o tema recorrente (ex: "Imersão IA", "Importação Pura"). Cadastro simples (nome único + descrição opcional), igual ao padrão de `Tier`/`Consultor`.
- `Evento` é uma edição específica dentro (opcionalmente) de uma série — `serieId` + `edicao` (Int) indicam qual série e qual número. Eventos sem `serieId` são "avulsos" (ainda não fazem parte de uma série reconhecida, ou nunca vão fazer — ex: eventos únicos). `nome`, `data`, `local` continuam existindo em todo `Evento`, série ou não. `metaParceiros` (Int?, desde 22/09/2026) é quantos parceiros o ideal seria conectar naquele evento — `null` usa a média padrão (hoje 2) definida em código na tela `/eventos`, um valor específico sobrescreve pra aquele evento.
- `ParticipacaoEvento` é a relação N:N materializada entre `Partner` e `Evento`, com dados específicos dessa participação: presença no palco (`participacaoPalco` + `quemParticipou`), presença de convidados na plateia (`participacaoPlateia`), envio de mailing. (O campo `valorEvento` existiu até 16/09/2026 — removido por nunca ter ganhado uma tela e não ser mais necessário; ver decisoes.md.) `status` ganhou o valor `CONVITE_ENVIADO` em 23/09/2026 — estado inicial de um convite pro Portal do Parceiro, antes do parceiro aceitar (`PLANEJADO`) ou recusar (`CANCELADO`).
- `ConvidadoEvento` (adicionado em 16/09/2026) — 1:N com `ParticipacaoEvento`. Cada convidado trazido pelo parceiro numa participação específica, com nome, empresa, telefone, CPF, e-mail e faturamento. Ver [decisoes.md](decisoes.md) pro porquê de ser tabela e não campo. Ganhou `status` (`PENDENTE | APROVADO | REJEITADO`) e `motivoRejeicao` em 23/09/2026, pro fluxo de aprovação de convidados enviados via Portal do Parceiro — ver decisoes.md.

## Meta / Receita

- `Meta` é a meta financeira da empresa como um todo (mensal/trimestral/anual) — não tem relação com `Partner`.
- `Receita` é o lançamento real de receita, com `origem` (indicação/contrato/comissão/evento/outro) e opcionalmente ligado a um `Partner`. A soma de `Receita` no período é o "atingido" contra a `Meta` — nunca é digitado manualmente.

## MetaParceiro

Meta específica por parceiro (hoje só `LEADS_QUALIFICADOS` — `REUNIOES_COMERCIAIS` é legado, não criável mais, só exibido se já existir). Sempre mensal (`periodo` no formato `AAAA-MM`). `fixa: true` significa meta contratual que se repete todo mês sem precisar recriar. O "realizado" é sempre calculado a partir de `Indicacao`/`Acao`, nunca lançado manualmente.

## User

Login do sistema. `role`: `ADMIN` (acesso total, gerencia usuários) | `ANALISTA` (acesso operacional completo) | `PARCEIRO` (só a própria ficha, via `partnerId`). O papel `PARCEIRO` já está implementado (ver `middleware.ts`) mas só é usado internamente por enquanto — não liberado pra parceiros externos reais.

## Consultor / Tier

Cadastros auxiliares, referenciados por **nome (string)**, não por FK:
- `Consultor.nome` é referenciado por `Indicacao.quemIndicou`.
- `Tier.nome` é referenciado por `Partner.tier`.

Ambos usam soft-delete (`ativo: false`) — nunca hard-delete quando há histórico dependendo do nome.

## AuditLog

Trilha de quem fez o quê. `userNome` é gravado como texto solto (não FK) pra sobreviver à remoção do usuário. Alimentado por `registrarAuditoria()` (`lib/auditoria.ts`), chamado manualmente em cada rota de API que cria/atualiza/remove algo — **não é automático via middleware do Prisma**, então uma rota nova precisa lembrar de chamar isso (ver lacuna conhecida em [decisoes.md](decisoes.md) sobre `metas-parceiro`).

## OnboardingItem

Checklist de onboarding por parceiro (item, ordem, concluído). Ver `lib/onboarding.ts` pra lógica de criação dos itens padrão.
