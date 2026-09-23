# Regras de negócio

Pra um CRM, o "porquê" mais importante não é técnico — é a regra de negócio: o que dispara uma mudança de status, como comissão é calculada, o que uma meta realmente conta. Isso normalmente só existe na cabeça de quem opera o sistema. Este documento registra o que está **de fato implementado no código** (não o que parece óbvio ou o que a intenção original documentava) — sempre com referência de arquivo.

Para decisões de modelagem (por que uma tabela existe, por que um campo foi adicionado), ver [decisoes.md](decisoes.md). Para os models em si, ver [modelo-dados.md](modelo-dados.md).

## Funil de Indicação

Valores de `status` (`prisma/schema.prisma`): `LEAD_POTENCIAL | ENVIADA | NEGOCIACAO | EM_ESPERA | CONVERTIDA | PERDIDA`, default `ENVIADA`.

- A ordem das colunas do Kanban (`app/indicacoes/page.tsx`) é `LEAD_POTENCIAL → ENVIADA → NEGOCIACAO → EM_ESPERA → CONVERTIDA/PERDIDA`, mas é **só ordem de exibição** — não existe máquina de estados que restrinja a transição. Qualquer indicação pode pular pra qualquer status a qualquer momento, em qualquer tela.
- **Revisitar automático (+30 dias):** ao mudar o status para `LEAD_POTENCIAL` ou `EM_ESPERA`, se a indicação ainda não tiver `revisitarEm` definido, o sistema preenche automaticamente com hoje + 30 dias. Essa regra é centralizada no backend (`PUT /api/indicacoes/[id]`), então vale igual não importa se a mudança de status veio do Kanban de `/indicacoes` ou da ficha do parceiro. *(Padronizado em 16/09/2026 — antes só existia no Kanban e só pro status `LEAD_POTENCIAL`.)*
- **Nada acontece automaticamente ao converter ou perder.** Não existe e-mail, criação automática de `Comissao`, nem qualquer efeito colateral especial quando o status vira `CONVERTIDA` ou `PERDIDA` — só o registro genérico de auditoria ("status mudou para X").
- `quemIndicou` é **texto livre**, sem integridade referencial com `Consultor` no banco. A UI restringe a escolha a um `<select>` de consultores ativos, mas a API aceita qualquer string.

## Comissão

- `Comissao.valor` é **sempre digitado manualmente** — nunca é calculado a partir de `Indicacao.valorEstimado` ou `Indicacao.faturamento`, mesmo havendo contratos com regras de comissão bem definidas (ex: "10% em 12 meses", documentados em `prisma/seed.ts`).
- `tipo` (`PERCENTUAL` | `FIXO`) é **só um rótulo de exibição** — muda como o número é formatado na tela (`12%` vs `R$ 1.200,00`), mas não afeta o cálculo. O valor em si é sempre o que o usuário digitou.
- Criar uma comissão é sempre uma ação manual (botão "definir comissão" na ficha do parceiro) — não é disparado automaticamente por nenhuma mudança de status da indicação.

## Tiers (Gold / Silver / Bronze)

Definições de referência (`prisma/seed.ts`): Gold = fixo alto (R$20k+/mês) ou cota de eventos ampla, parceiro institucional; Silver = fixo moderado (R$7-20k) ou comissão relevante; Bronze = sem fixo, via comissão/cupom.

**Hoje o tier é puramente cosmético.** Não há nenhuma regra de negócio (cota, comissão, ordenação, filtro) condicionada ao valor de `Partner.tier` — é só um badge de exibição e um campo de formulário. Se no futuro fizer sentido vincular tier a comportamento (ex: cota mínima de eventos por tier), isso ainda não existe.

## ICP (Perfil de Cliente Ideal)

Campos `icpFaturamentoMin/Max`, `icpSegmento`, `icpCaracteristicas` na ficha do parceiro.

O comentário original no schema (`prisma/schema.prisma`) diz que o ICP seria "usado pra cruzar com a carteira de clientes e sugerir indicações mais assertivas" (decisão de reunião, 13/07/2026) — **essa funcionalidade nunca foi implementada.** Hoje o ICP é **puramente informativo**: só é exibido na ficha do parceiro e usado como indicador visual ("ICP definido?") na listagem. Nenhum código cruza esses campos com `Indicacao.faturamento` pra filtrar, sugerir ou validar indicações.

## Ciclo de vida do parceiro

- `status` (`EM_ATIVACAO | ATIVO | PAUSADO`) é **sempre alterado manualmente**, via formulário de edição — nenhuma automação muda esse campo (indicação convertida, evento concluído, etc. não têm efeito sobre ele).
- `mantenedor` e `prioritario` também são flags **100% manuais** (checkboxes no formulário). `prioritario` tem efeitos de exibição (ordena a listagem de partners primeiro, agrupa na seção "Acompanhamento próximo", conta como KPI no dashboard) — mas nada disso é setado automaticamente por regra de negócio.

## Metas da empresa (`Meta`) vs. Metas do parceiro (`MetaParceiro`)

**Meta da empresa** (`app/api/dashboard-metas/route.ts`): "atingido" mensal = soma de `Receita.valor` cuja `data` cai naquele mês. "Atingido" trimestral = soma dos 3 meses. Toda receita lançada no período conta, sem filtro por origem.

**MetaParceiro** — cálculo feito no client (`app/partners/[slug]/page.tsx` e `app/api/dashboard/route.ts`, com a mesma fórmula duplicada nos dois lugares):
- `LEADS_QUALIFICADOS`: conta **toda** `Indicacao` do parceiro com `data` no período — **independente do status**, inclusive `PERDIDA` conta como "atingido". **Isso é intencional**: é meta de volume de indicações enviadas, não de conversão/qualidade.
- `REUNIOES_COMERCIAIS` (legado, não criável mais): conta `Acao` com `tipo="REUNIAO"` e `status="CONCLUIDA"` — só implementado na ficha do parceiro, não replicado no dashboard geral.
- Meta `fixa: true` (contratual) sempre calcula contra o **mês atual**, não contra o mês em que foi criada.
- Quando existe meta fixa e meta específica do mês pro mesmo parceiro+tipo, a específica do mês tem prioridade (no dashboard).
- **Projeção de fechamento (`lib/metaParceiro.ts`, desde 22/09/2026):** com base no que já foi realizado até hoje e nos dias já decorridos no mês, projeta um "run-rate" simples (realizado ÷ dias decorridos × dias no mês) pra estimar se a meta será batida no ritmo atual. Só é exibida pra metas do mês corrente (não faz sentido projetar mês passado/futuro) e some assim que a meta já foi batida. Mesma fórmula usada na ficha do parceiro e no dashboard/indicações — ver decisoes.md.

## Eventos e cota contratada

- `cotaEventosContratados` é comparado contra a contagem de `ParticipacaoEvento` com **status `REALIZADO`** apenas. *(Corrigido em 16/09/2026 — antes contava qualquer participação, inclusive `PLANEJADO` e `CANCELADO`, o que inflava indevidamente o "gasto" da cota.)* `CONVITE_ENVIADO` (desde 23/09/2026) também fica de fora dessa contagem, pelo mesmo motivo.
- A cota é **só um indicador visual** (barra de progresso) — não existe nenhuma trava que impeça registrar uma nova participação além da cota contratada.
- Uma `ParticipacaoEvento` pode ser criada de três lugares — pela ficha do parceiro (escolhendo o evento), pela tela `/eventos` com "+ Adicionar parceiro" (registro direto, já `PLANEJADO`/`REALIZADO`/`CANCELADO`, admin já sabe que aconteceu) ou "+ Atribuir evento (convite)" (cria como `CONVITE_ENVIADO`, aguardando o parceiro aceitar/recusar no Portal). Os três caminhos usam a mesma rota de API (`POST /api/participacoes-evento`), então o resultado é idêntico e sempre aparece nos mesmos lugares — não há sincronização especial, é a mesma tabela.
- **Fluxo de convite (desde 23/09/2026):** `CONVITE_ENVIADO` → parceiro aceita (`PLANEJADO`) ou recusa (`CANCELADO`, sem status "recusado" separado) via `PUT /api/portal/eventos/[id]`. Só dá pra responder um convite que ainda está `CONVITE_ENVIADO` — tentar responder de novo depois de já aceito/recusado dá erro.
- `ConvidadoEvento` (convidados trazidos pelo parceiro numa participação) tem `status` (`PENDENTE | APROVADO | REJEITADO`, desde 23/09/2026): um convidado lançado direto pelo admin (ficha do parceiro) já nasce `APROVADO`; um enviado pelo parceiro via Portal (`POST /api/portal/eventos/[id]/convidados`, só permitido quando a participação já está `PLANEJADO`) nasce `PENDENTE` e precisa ser aprovado ou rejeitado (com motivo obrigatório, salvo em `motivoRejeicao`) na tela `/eventos`. Fora isso, não tem regra de negócio associada — ver [modelo-dados.md](modelo-dados.md).

## Onboarding

Checklist padrão de 8 itens (`lib/onboarding.ts`), baseado no documento "Onboarding de Parcerias — Ecommerce Puro".

- Criado automaticamente ao cadastrar um parceiro, tanto manualmente (`POST /api/partners`) quanto via **importação em massa por CSV** (`POST /api/partners/import`). *(A importação em massa passou a criar o checklist em 16/09/2026 — antes só o cadastro manual disparava isso.)*
- Parceiros que já existiam antes dessa automação, ou que foram importados antes do ajuste acima, não ganham checklist retroativamente — precisa adicionar manualmente pelo botão "+ Item" na ficha.

## Gaps conhecidos (não são regras — são pontos em aberto, não mexer sem alinhar antes)

- `DELETE /api/metas-parceiro/[id]` não registra auditoria, diferente da maioria das rotas de delete (ver [decisoes.md](decisoes.md)).
- O cálculo de progresso de `MetaParceiro` está duplicado em dois arquivos (`app/partners/[slug]/page.tsx` e `app/api/dashboard/route.ts`) com a mesma fórmula — e só o segundo não implementa `REUNIOES_COMERCIAIS`. Reduz a chance de manter os dois em sincronia se a regra mudar de novo.
