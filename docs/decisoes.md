# Decisões de arquitetura

Log curto de decisões de modelagem/arquitetura não óbvias — o quê, por quê, e quando. Objetivo: evitar reexplicar (ou reabrir) a mesma discussão meses depois. Entradas mais recentes no topo.

Não é um changelog de features — é só o "porquê" por trás de escolhas que não seriam óbvias só lendo o código.

---

## 2026-09-16 — Convidados de evento viram tabela relacional, não campos soltos

**Contexto:** ao marcar que um parceiro trouxe convidado(s) pra um evento (`participacaoPlateia`), era preciso registrar os dados de cada convidado (nome, telefone, e-mail, faturamento).

**Decisão:** criar `ConvidadoEvento` como tabela própria (1:N com `ParticipacaoEvento`), em vez de adicionar campos escalares direto em `ParticipacaoEvento` (que seria o padrão mais simples, já usado em `quemParticipou` pro palco).

**Por quê:** confirmado com o usuário que um parceiro pode trazer vários convidados diferentes pro mesmo evento — um campo único não seria suficiente. O padrão de campo escalar (`quemParticipou`) só faz sentido quando é *uma* pessoa por participação (quem falou no palco).

**Onde:** `prisma/schema.prisma` (model `ConvidadoEvento`), `app/api/convidados-evento/`, componente `ConvidadosEvento` em `app/partners/[slug]/page.tsx`.

---

## 2026-09-16 — Convidado ganhou `empresa` e `cpf` além de nome/telefone/e-mail/faturamento

**Contexto:** primeira versão do `ConvidadoEvento` só tinha os 4 campos usados em `Indicacao` (nome, telefone, e-mail, faturamento).

**Decisão:** adicionar `empresa` (pedido explícito) e `cpf` (implícito — veio junto nos dados reais fornecidos pelo usuário pra cadastrar os primeiros convidados).

**Por quê:** rastrear de qual empresa o convidado veio importa pro contexto de negócio (ex: identificar que vários convidados vieram da mesma conta/cliente em potencial).

---

## 2026-09-16 — Eventos agrupados por série + edição, e limpeza de dados históricos

**Contexto:** os "eventos" cadastrados (Imersão IA, Importação Pura, etc.) tinham cada edição como uma linha solta de `Evento`, com o número da edição embutido no `nome` ("Imersão IA #03"). O usuário queria agrupar visualmente por tema.

**Decisão:** criar `EventoSerie` (cadastro próprio, nome + descrição) e dar a `Evento` os campos `serieId` + `edicao` (Int), em vez de continuar extraindo o número do nome. A tela `/eventos` agora agrupa por série, com as edições listadas embaixo de cada tema — eventos sem série ficam numa seção "avulsos".

**Limpeza de dados feita junto (histórica, não repetir):**
- 4 eventos que eram na verdade a mesma edição de 2 dias, lançada em 2 linhas (`Importação Pura #07`, `Imersão Tributária #02`, `Performance Meli #02`, `Marca de Valor #01`) foram mesclados em 1 linha cada, movendo as participações e deduplicando registros idênticos.
- O script de seed original (`prisma/seed.ts`) tinha uma lógica que agrupava múltiplas ocorrências históricas reais da Olist sob um único `Evento` (usando a data mais antiga), gerando várias `ParticipacaoEvento` idênticas exceto pelo campo `valorEvento`. Isso causou confusão inicial (pareciam duplicatas de clique, mas eram registros históricos distintos) — resolvido depois que `valorEvento` foi removido (ver abaixo), o que tornou essas linhas duplicatas de verdade, e puderam ser deduplicadas com segurança.
- Renomeações pra bater com a numeração real (confirmada via ClickUp): "Importação Pura" (24/02) → "Importação Pura #07"; "Imersão Financeira" (10/02) → "Imersão Financeira #03"; "Performance Shopee" (23/04) → "Performance Shopee #01".
- 2 eventos ficaram de fora de qualquer série, deliberadamente: `Melicidade` (evento único, confirmado pelo usuário) e `Inteligência Artificial` (0 participações, antecede "Imersão IA #01" em 1 dia — não confirmado se é a mesma coisa, deixado como está).

**Removido:** `ParticipacaoEvento.valorEvento` (Float?) — existia desde o seed inicial só "pra ter ideia do ticket do evento", nunca ganhou campo em nenhuma tela (nem exibição, nem formulário), e o usuário confirmou que não seria usado de novo. `Receita` (com `origem: "EVENTO"`) é a fonte real de patrocínio/dinheiro, não esse campo.

---

## 2026-09-16 — `icpPedidosMin` como campo próprio, separado do faturamento

**Contexto:** ao preencher o ICP de 12 parceiros em conjunto com o usuário, "volume de pedidos/mês" apareceu como critério de qualificação em vários deles (Stockfy, Seenc, Base, Olist) — às vezes junto com faturamento, às vezes **no lugar** dele (WMS como Stockfy/Seenc qualificam por volume, não por faturamento).

**Decisão:** criar `Partner.icpPedidosMin` (Int?) como campo próprio, no mesmo padrão de `icpFaturamentoMin`/`Max`, em vez de deixar esse número embutido em `icpCaracteristicas` (texto livre).

**Por quê:** é um critério numérico que se repete com força suficiente pra merecer ser comparável entre parceiros (like faturamento já é) — diferente de "regime tributário" ou "investimento em ferramenta", que até agora só apareceram uma vez cada e continuam em texto livre por enquanto (não criar campo estruturado especulativamente por causa de um único exemplo).

**Não fizemos:** um modelo de "faixas em fases" (múltiplos degraus de faturamento/pedidos por parceiro) — nenhum parceiro real pediu isso; os critérios sempre foram limiar único ("a partir de X"), não faixas escalonadas.

---

## 2026-09-16 — Três comportamentos padronizados durante o mapeamento de regras de negócio

Ao escrever [regras-de-negocio.md](regras-de-negocio.md), mapeamos o código real (não a intenção documentada) e encontramos 3 inconsistências. Perguntado, o usuário decidiu corrigir as 3 no código (não só documentar como estão):

1. **Revisitar automático (+30 dias)** — antes só existia no Kanban de `/indicacoes`, só pro status `LEAD_POTENCIAL`. Centralizado em `PUT /api/indicacoes/[id]` (`app/api/indicacoes/[id]/route.ts`), agora vale pra `LEAD_POTENCIAL` e `EM_ESPERA`, de qualquer tela que altere o status.
2. **Cota de eventos contratados** — antes contava qualquer `ParticipacaoEvento` (inclusive `PLANEJADO`/`CANCELADO`) contra a cota. Agora conta só `status === "REALIZADO"` (`app/partners/[slug]/page.tsx`, `app/partners/page.tsx`).
3. **Onboarding em importação CSV** — `criarChecklistOnboarding()` não era chamado em `POST /api/partners/import`, só no cadastro manual. Agora é chamado nos dois.

**Por quê registrar como decisão e não só "bugfix":** o comportamento anterior não estava documentado em lugar nenhum — só existia "sendo assim" no código. Sem esse registro, um `db push` ou refactor futuro poderia reverter silenciosamente pro comportamento antigo sem ninguém perceber que era uma regressão.

Um quarto ponto (meta de `LEADS_QUALIFICADOS` contar indicação `PERDIDA` como "atingido") foi confirmado como **intencional** — não mexido, só documentado em regras-de-negocio.md.

---

## Decisões fundacionais (sem data exata registrada)

Estas já estavam em vigor quando esta sessão de documentação começou — descritas no `CLAUDE.md` e no `README.md` originais do projeto, sem timestamp preciso de quando foram tomadas:

- **Projeto 100% local, sem deploy.** Dados de contrato/comissão/faturamento de parceiros não devem ficar expostos publicamente. Qualquer sugestão de hospedagem/deploy público exige alerta explícito antes.
- **Campos "tipo enum" são `String`, não enum do Prisma.** SQLite não suporta enum nativo — validação de valores permitidos fica no frontend/API.
- **Progresso de metas (`Meta`, `MetaParceiro`) é sempre calculado, nunca digitado.** O "atingido" vem de somar `Receita`/`Indicacao`/`Acao` — evita divergência entre o que foi lançado e o que realmente aconteceu.
- **Soft-delete em cadastros com histórico (`Consultor`, `Tier`).** Indicações antigas continuam referenciando o nome; apagar de verdade quebraria o histórico.
- **Sem gerenciador de estado global.** Cada página usa `useState` + `fetch` direto — decisão deliberada de manter o projeto simples pro tamanho e uso atual (um usuário principal).

## Lacunas conhecidas (não são decisões — são pontos em aberto)

- `DELETE /api/metas-parceiro/[id]` não chama `registrarAuditoria()` — diferente da maioria das outras rotas de delete. Detectado em 16/09/2026 depois de uma remoção acidental de uma meta real durante testes (sem log, precisou ser reconstruída manualmente a partir do que a tela mostrava). Vale alinhar com o padrão das outras rotas se for mexer nesse arquivo por outro motivo.
