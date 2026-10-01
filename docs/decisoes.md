# Decisões de arquitetura

Log curto de decisões de modelagem/arquitetura não óbvias — o quê, por quê, e quando. Objetivo: evitar reexplicar (ou reabrir) a mesma discussão meses depois. Entradas mais recentes no topo.

Não é um changelog de features — é só o "porquê" por trás de escolhas que não seriam óbvias só lendo o código.

---

## 2026-10-01 — Dashboard ganha filtro de período (`/api/dashboard?mes=YYYY-MM`)

**Contexto:** `/api/dashboard` sempre calculava tudo em cima do mês corrente (`new Date()`), sem jeito de olhar meses anteriores — "Indicações no mês", a lista de recentes e a tabela de metas por parceiro só mostravam o mês atual, sem filtro nenhum.

**Decisão:** `GET /api/dashboard` aceita `?mes=YYYY-MM` (default: mês atual, mesmo comportamento de sempre se omitido). O filtro no front é um `<input type="month">` perto do título, com um link "mês atual" que só aparece quando o período selecionado é diferente do mês corrente.

**Detalhe não óbvio — projeção em mês passado:** `calcularProjecaoMensal` (`lib/metaParceiro.ts`) extrapola "realizado até agora" pros dias que faltam no mês, o que só faz sentido pro mês corrente. Pra um mês já encerrado, passar `new Date()` como "hoje" pra essa função inflaria a projeção (ou faria pior que o real, dependendo de quando no mês passado a indicação caiu). A correção foi passar o **último dia do mês selecionado** como "hoje" quando o período não é o atual — isso faz `diaAtual === diasNoMes` dentro da fórmula, zerando a extrapolação (projeção = realizado, sem inventar números pro resto de um mês que já passou).

**O que ficou de fora do escopo do filtro:** "Taxa de conversão" (é sobre o total histórico, não teria sentido mudar por mês), "Comissão pendente/paga" (idem, são saldos acumulados) e o widget de meta trimestral (usa `/api/dashboard-metas`, uma fonte de dado separada, já tem seu próprio seletor de ano em `/metas`) continuam mostrando o todo, não o período selecionado — só o que já era rotulado como "do mês" passou a respeitar o filtro.

**Onde:** `app/api/dashboard/route.ts`, `app/page.tsx`.

---

## 2026-09-29 — "Convidados na plateia" no "+ Adicionar parceiro" já abre o bloco de convidado

**Contexto:** o admin só conseguia cadastrar convidados de plateia depois de criar a participação, indo na ficha do parceiro (`ConvidadosEvento` em `app/partners/[slug]/page.tsx`). Ao marcar "Convidados na plateia" direto no "+ Adicionar parceiro" (`app/eventos/page.tsx`), nada acontecia — só o boolean era salvo.

**Decisão:** marcar o checkbox agora abre um bloco com os mesmos campos do form de convidado do Portal do Parceiro (nome, telefone, e-mail, CPF, empresa, faturamento), com "+ Outro convidado" pra registrar mais de um. Como a `ParticipacaoEvento` ainda não existe nesse momento, os convidados ficam em um estado local (rascunho) e só são enviados (`POST /api/convidados-evento`, um por um) depois que a participação é criada e o id real existe — nasce `APROVADO` automaticamente, mesma regra de qualquer lançamento direto do admin.

**Por quê:** evita o passo extra de ir na ficha do parceiro logo em seguida só pra registrar quem veio na plateia — o admin já sabe os convidados no momento de atribuir o parceiro ao evento, na maioria dos casos.

**Onde:** `AdicionarParceiroForm` em `app/eventos/page.tsx`.

---

## 2026-09-29 — Gerenciar convidados de um parceiro já adicionado, direto em `/eventos`

**Contexto:** o item anterior cobria só o momento de adicionar o parceiro ao evento. Pra um parceiro **já** vinculado, o único jeito de ver/adicionar convidados era ir na ficha dele (`ConvidadosEvento` em `app/partners/[slug]/page.tsx`) — não existia atalho a partir da tela do evento, onde o admin já está olhando quem participou.

**Decisão:** cada chip de parceiro no evento expandido ganhou um botão "convidados (N)" que abre um painel inline (`ConvidadosParticipacao`) listando os convidados dessa participação (com badge de status e motivo de rejeição, se houver) e um "+ Convidado" com os mesmos campos do resto do app. Continua sendo uma segunda via de acesso — a ficha do parceiro não foi alterada nem substituída.

**Por quê:** o admin normalmente já está na tela do evento decidindo quem vai/vem, e forçar uma ida à ficha do parceiro só pra registrar quem ele trouxe era um passo a mais sem necessidade.

**Onde:** `ConvidadosParticipacao` e `ConvidadoQuickForm` em `app/eventos/page.tsx`.

---

## 2026-09-23 — Comentários bidirecionais em indicação (Portal ↔ admin) + sinalização de não lida

**Contexto:** o parceiro pedia pra poder ver mais detalhe da própria indicação no Portal e documentar o andamento do cliente do lado dele, de forma que o admin visse isso na ficha interna. Também pediu algum aviso visual quando o outro lado comentasse algo novo.

**Decisão:** reaproveitar a thread `NotaIndicacao` já existente (usada hoje só pelo admin em `/indicacoes`) como canal **compartilhado e bidirecional**, em vez de criar uma tabela nova:
- `autor` (`ADMIN | PARCEIRO`, default `ADMIN`) identifica quem escreveu.
- `lida` (`Boolean`, default `false`) significa "o **outro** lado já viu essa nota" — não é um campo de leitura por usuário individual, é suficiente porque só existem os dois papéis nessa conversa.
- Marcar como lida acontece no momento em que o lado que **não escreveu** abre o detalhe da indicação (admin abre "Ver mais" em `/indicacoes`; parceiro abre "Detalhes" no Portal) — não existe um botão explícito de "marcar como lida".
- Sinalização é só um texto/emoji (🔴 Nova mensagem do parceiro / 🔴 antes de "Detalhes"), seguindo o estilo já usado no app pra alertas (⚠️ Revisitar em atrasada) — sem componente de badge numérico novo.
- Notas antigas (3, todas do admin) foram migradas pra `lida: true` no push, pra não gerar uma onda de notificação retroativa sobre histórico que ninguém "não viu de verdade".
- O Portal **não** ganhou acesso a `telefone`/`email`/`cnpj`/`faturamento`/`observações` da indicação — só o essencial (nome, status, data) mais a conversa. Esse limite já tinha sido definido na primeira versão do Portal (ver entrada de 23/09/2026 mais abaixo) e continua valendo aqui.

**Por quê:** uma tabela nova exigiria replicar toda a lógica de exibição/ordenação que a thread de notas já tem, e criaria dois lugares diferentes pra "conversa sobre o cliente" (uma pro admin, outra pro parceiro) que precisariam ficar sincronizados manualmente. Um único campo `lida` (em vez de `lidaPeloAdmin`/`lidaPeloParceiro`) é suficiente porque cada nota só tem um autor possível — a leitura pendente é sempre do lado oposto a quem escreveu.

**Testado:** parceiro (Base) comentou numa indicação → badge apareceu no card do admin em `/indicacoes` → admin abriu e o badge sumiu → admin respondeu → badge de não lida apareceu no Portal → parceiro abriu e sumiu. Dados de teste (notas, usuários, audit log) removidos depois.

**Onde:** `prisma/schema.prisma` (`NotaIndicacao.autor`/`lida`), `app/api/notas-indicacao/route.ts`, `app/api/notas-indicacao/marcar-lidas/route.ts` (novo), `app/api/portal/indicacoes/[id]/route.ts` (novo), `app/api/portal/indicacoes/[id]/notas/route.ts` (novo), `app/api/portal/meus-dados/route.ts` (`notasNaoLidas` por indicação), `app/indicacoes/page.tsx`, `app/portal/page.tsx` (`IndicacaoDetalheModal`).

**Checkpoint de reversão:** commit `5e7ba0c` é o estado imediatamente anterior a essa feature — se a navegabilidade não for aprovada, dá pra reverter só essa parte com `git revert` (ou `git reset --hard 5e7ba0c` se for descartar tudo depois desse ponto) sem perder o Portal do Parceiro, o fluxo de convite de evento, nem a UX de indicações que já foram validados antes.

---

## 2026-09-23 — Fluxo de convite de evento + aprovação de convidado (estende ConvidadoEvento, não cria um novo)

**Contexto:** o pedido original era estender `Evento` com um fluxo de convite/aceite pro parceiro (status inicial antes de PLANEJADO/REALIZADO/CANCELADO) e um "novo model ConvidadoEvento" pra convidados com aprovação do admin. Ao investigar, dois achados mudaram o escopo:
1. `ParticipacaoEvento.status` já existia (`String @default("PLANEJADO")`, PLANEJADO\|REALIZADO\|CANCELADO) — não precisou de migração, só adicionar `CONVITE_ENVIADO` como valor válido novo (é `String`, não enum real — ver "Padrão importante" no CLAUDE.md).
2. `ConvidadoEvento` já existia desde 16/09/2026 (outro fluxo — admin registra manualmente quem o parceiro trouxe). Criar um segundo model com o mesmo nome não é possível nem faz sentido; a solução foi **estender o model existente** com `status` (`PENDENTE | APROVADO | REJEITADO`, default `PENDENTE`) e `motivoRejeicao`.

**Decisão:**
- `CONVITE_ENVIADO` é criado pelo admin via "+ Atribuir evento (convite)" (`app/eventos/page.tsx`, ação nova, separada do "+ Adicionar parceiro" já existente — os dois usam a mesma rota `POST /api/participacoes-evento`, só muda o `status` inicial). O parceiro aceita/recusa no Portal (`PUT /api/portal/eventos/[id]`, body `{ acao: "aceitar" | "recusar" }`) — aceitar vira `PLANEJADO`, recusar vira `CANCELADO` (sem status "recusado" separado, por pedido explícito).
- Convidado enviado pelo parceiro via Portal (`POST /api/portal/eventos/[id]/convidados`, só aceito quando a participação já é `PLANEJADO`) nasce `PENDENTE`. Convidado lançado direto pelo admin (`POST /api/convidados-evento`, fluxo antigo) nasce **`APROVADO` automaticamente** — decisão explícita do usuário: lançamento direto do admin já é confiável, só o que vem de fora (parceiro) precisa de aprovação.
- Os 3 `ConvidadoEvento` que já existiam antes dessa mudança foram migrados de `PENDENTE` (valor herdado do default no `db push`) pra `APROVADO`, já que são lançamentos antigos do admin, não convites pendentes de verdade.
- Aprovação/rejeição (`PUT /api/convidados-evento/[id]`, campos `status`/`motivoRejeicao` agora opcionais) fica numa fila dentro da própria tela do evento em `/eventos` — reaproveita o local onde as participações do evento já são exibidas, em vez de criar uma view agregada separada.

**Cuidado técnico:** o PUT de `/api/convidados-evento/[id]` é compartilhado entre o form de edição comum (manda todos os campos sempre) e a ação de aprovar/rejeitar (manda só `status`/`motivoRejeicao`) — por isso cada campo só entra no `update` quando vem preenchido no body (`campo !== undefined ? campo : undefined`), senão um approve/reject zeraria telefone/CPF/e-mail/empresa/faturamento do convidado (JS `undefined || null` vira `null`).

**Testado:** criado um admin e um parceiro (Base) temporários — convite enviado, aceito no Portal, convidado de teste enviado, rejeitado pelo admin com motivo, motivo conferido no Portal. Auditoria confirmada em `/auditoria` pros 4 passos. Tudo (usuários, o convidado e a participação de teste) removido do banco depois.

**Onde:** `prisma/schema.prisma` (`ParticipacaoEvento.status`, `ConvidadoEvento.status`/`motivoRejeicao`), `app/eventos/page.tsx` (`AtribuirConviteForm`, `ConvidadoPendenteRow`), `app/portal/page.tsx` (`EventoConviteCard`, `EventoConfirmadoCard`, `ConvidadoForm`), `app/api/portal/eventos/[id]/route.ts`, `app/api/portal/eventos/[id]/convidados/route.ts`, `app/api/convidados-evento/route.ts` e `[id]/route.ts`, `app/api/participacoes-evento/route.ts`, `components/Badge.tsx`.

---

## 2026-09-23 — Portal do Parceiro: tela própria, dados restritos, partnerId nunca por URL

**Contexto:** o papel `PARCEIRO` já existia no `User`/middleware, mas só redirecionava pra `/partners/[id]` (a ficha interna completa, cheia de dado que só a EP deveria ver — ICP, observações internas, dados de outros parceiros linkáveis por navegação, etc.). Faltava uma tela própria, enxuta, só com o que interessa ao parceiro.

**Decisão:** criar `/portal` como rota isolada (sem a sidebar interna — mesmo tratamento de `/login`/`/definir-senha` em `AppShell.tsx`), consumindo um endpoint próprio (`GET /api/portal/meus-dados`) que:
- Deriva o `partnerId` **só da sessão** (`getServerSession`), nunca de parâmetro de URL — mesmo que o middleware já bloqueie outras rotas pro papel `PARCEIRO`, o endpoint reforça a checagem por conta própria (defesa em profundidade: uma rota de API nova nunca deve confiar só no middleware).
- Retorna só os campos que fazem sentido pro parceiro ver: indicações (nome do lead, status, data — sem telefone/e-mail/CNPJ/faturamento/observações, que são dado de análise interna da EP), comissões (valor, tipo, status de pagamento), eventos (nome, data, status de participação, palco) e a meta do mês (mesma fórmula de projeção de `lib/metaParceiro.ts`, mesma regra de desempate meta fixa vs. meta do mês de `app/api/dashboard/route.ts`).
- `middleware.ts` foi atualizado pra redirecionar `PARCEIRO` pra `/portal` em vez de `/partners/[id]`.

**Por quê:** separar completamente a superfície de dado exposta ao parceiro da ficha interna evita que qualquer campo novo adicionado à ficha interna (`/partners/[slug]`) vaze pro parceiro por engano — a tela do portal só sabe dos campos que ela mesma busca, não herda nada da ficha interna.

**Testado:** criado um usuário `PARCEIRO` temporário vinculado ao parceiro "Base", login completo, confirmado que `/partners` redireciona de volta pro `/portal`, e que `GET /api/portal/meus-dados` retorna só dado desse parceiro — depois removido do banco (não é dado real).

**Onde:** `app/portal/page.tsx`, `app/api/portal/meus-dados/route.ts`, `middleware.ts`, `components/AppShell.tsx`, `components/Sidebar.tsx`.

---

## 2026-09-22 — Edição do cliente indicado via modal (primeiro modal do app)

**Contexto:** o card de indicação (Kanban em `/indicacoes`) só permitia editar `quemIndicou`, `revisitarEm` e `observacoes` inline — `leadNome`, `telefone`, `email`, `cnpj` e `faturamento` só podiam ser definidos uma vez, na criação. A API (`PUT /api/indicacoes/[id]`) já aceitava todos esses campos; faltava só a UI.

**Decisão:** adicionar um botão "✏️ Editar cliente" no card que abre um modal (overlay `fixed inset-0`) com os 5 campos num único formulário e um só Salvar/Cancelar — em vez de replicar o padrão de "editar" campo-a-campo já usado em `quemIndicou`/`observacoes`, ou de mover isso pra uma página/rota separada.

**Por quê:** o usuário pediu explicitamente um "popup" pra editar os dados do cliente de uma vez só. Um formulário único evita ter que clicar "editar" 5 vezes pra corrigir nome+telefone+e-mail juntos (caso comum quando o dado veio errado da indicação original). Esse é o primeiro modal do app — se surgir necessidade parecida em outra tela, reaproveitar esse padrão (`fixed inset-0 bg-black/50` + card centralizado) em vez de inventar um novo.

**Onde:** `IndicacaoCard` em `app/indicacoes/page.tsx` (estado `editandoCliente`/`clienteForm`, função `salvarCliente`).

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

## 2026-09-22 — Metas de indicação não atualizavam após lançar nova indicação

**Sintoma:** usuário lançava indicação nova em `/indicacoes`, a lista/Kanban atualizava, mas a tabela "Metas de indicação por parceiro (mês atual)" continuava com o percentual antigo.

**Causa:** `app/indicacoes/page.tsx` buscava `/api/dashboard` (fonte dos dados de meta) **só uma vez**, no `useEffect` de montagem — nunca de novo. A função `load()` usada depois de criar/editar uma indicação só recarregava `/api/indicacoes`, sem tocar nas metas.

**Correção:** `load()` agora recarrega indicações **e** metas juntos (`loadMetas()` embutido nela). Como só existe um lugar que chama isso após mutação (`onSaved={load}` no `IndicacaoCard`, mais o próprio `submit` do formulário), a correção cobre os dois casos sem precisar tocar em mais nada.

**Por quê registrar:** é a mesma classe de bug do painel "Próximos eventos" de eventos, adaptada — dado "read-only" buscado uma vez só, sem invalidação depois de uma mutação relacionada. Vale checar esse padrão (fetch numa lista, mutação em outra tela/estado, sem recarregar a lista) sempre que uma tela nova combinar dado calculado com formulário de criação.

---

## 2026-09-22 — Painel "Próximos eventos" + meta de parceiros configurável por evento

**Contexto:** o usuário sentia falta de uma visão rápida de quais eventos futuros ainda precisam de parceiros conectados, sem precisar abrir cada série. A referência inicial foi "em média, 2 parceiros por evento" — mas nem todo evento tem o mesmo porte.

**Decisão:**
- Painel no topo de `/eventos` lista só eventos com data futura (`data >= hoje`, ordenado por proximidade), com indicador visual (🔴/🟡/🟢) de quantos parceiros faltam pra bater a meta. Clicar num evento expande a série certa e rola a tela até ele.
- `Evento.metaParceiros` (Int?, opcional) permite sobrescrever a meta padrão (constante `META_PARCEIROS_POR_EVENTO = 2` no código) por evento — eventos maiores podem pedir mais parceiros sem mudar o padrão global.

**Critério de quando um evento some do painel — confirmado com o usuário:** só por **data** (a partir do dia seguinte), independente do `status`. Foi perguntado se deveria ser por status (só sumir quando "Realizado"/"Cancelado") em vez disso, e o usuário confirmou que por data já resolve — mesmo que um evento fique esquecido como "Planejado" depois de acontecer, ele soma do painel de qualquer forma. Não é bug, é o comportamento decidido.

---

## 2026-09-22 — Bug de fuso horário (D-1) em todas as datas "puras" exibidas

**Contexto:** ao lançar uma edição nova de evento com data 06/04/2026, a tela mostrava 05/04/2026 — um dia antes do que foi digitado. O dado salvo no banco estava **correto** (`2026-04-06T00:00:00.000Z`); o bug era só na exibição.

**Causa raiz:** campos de "data pura" (sem hora real — vêm de `<input type="date">` e são guardados como meia-noite UTC: `Evento.data`, `Indicacao.data`, `Acao.dataPlanejada`) estavam sendo formatados com `Intl.DateTimeFormat("pt-BR").format(new Date(d))` **sem fixar `timeZone: "UTC"`**. Sem isso, o navegador converte pro fuso local (Brasil, UTC-3) antes de formatar — meia-noite UTC vira 21h do dia anterior, e o dia exibido "volta" um dia. O mesmo problema afetava comparações tipo "já passou da data" / "atrasada", que comparavam `new Date(dataPlanejada) < new Date()` (instantes exatos) em vez de datas de calendário.

**Correção:** 
- Todo formatador de data pura (`dateFmt` em `eventos`, `page` (dashboard), `cronograma`, `partners/[slug]`) agora fixa `timeZone: "UTC"`.
- Toda comparação "atrasada"/"já passou" pra datas puras agora compara **strings de calendário** (`campo.slice(0,10) < hojeISO()`), nunca instantes exatos — evita o mesmo problema E o inverso (marcar algo como atrasado horas antes da hora certa).
- **Não confundir com timestamps de verdade** (`OnboardingItem.concluidoEm`, `AuditLog.createdAt`, `User.setupTokenExpira`, `NotaIndicacao.createdAt`) — esses têm hora real e devem continuar formatados no fuso local, sem fixar UTC. Por isso `partners/[slug]/page.tsx` agora tem duas funções (`dateFmt` pra data pura, `dateHoraFmt` pra timestamp real) em vez de uma só.

**Por quê registrar:** `app/metas/page.tsx` já tinha esse fix aplicado (`timeZone: "UTC"`) antes de qualquer outra página — ou seja, esse bug já tinha sido corrigido uma vez e reintroduzido em código novo por não estar documentado. Qualquer novo formatador de data pura deve seguir esse padrão desde o início.

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

## 2026-09-22 — Projeção de meta virou função compartilhada (`lib/metaParceiro.ts`)

**Contexto:** o usuário pediu um indicador de projeção ("no ritmo atual, vou bater a meta do mês ou não?") pra `MetaParceiro`. Essa métrica precisava aparecer tanto na ficha do parceiro quanto no dashboard/indicações — os dois lugares que já calculavam "realizado" de formas duplicadas (ver gap abaixo).

**Decisão:** em vez de escrever a fórmula de projeção duas vezes (repetindo o problema já conhecido), criamos `lib/metaParceiro.ts` com uma função pura (`calcularProjecaoMensal`) importada pelos dois lugares. Não resolve a duplicação do cálculo de "realizado" em si (isso exigiria uma refatoração maior, fora do escopo do pedido), mas evita que a *nova* lógica de projeção vire uma terceira cópia divergente.

**Fórmula:** run-rate simples — `realizado ÷ dias decorridos no mês × dias totais no mês` = projeção de fechamento. Considerado suficiente pro pedido; não pondera sazonalidade nem pesos por semana.

## Lacunas conhecidas (não são decisões — são pontos em aberto)

- `DELETE /api/metas-parceiro/[id]` não chama `registrarAuditoria()` — diferente da maioria das outras rotas de delete. Detectado em 16/09/2026 depois de uma remoção acidental de uma meta real durante testes (sem log, precisou ser reconstruída manualmente a partir do que a tela mostrava). Vale alinhar com o padrão das outras rotas se for mexer nesse arquivo por outro motivo.
- O cálculo de "realizado" de `MetaParceiro` (não a projeção, essa já foi unificada) ainda está duplicado entre `app/partners/[slug]/page.tsx` e `app/api/dashboard/route.ts`, com a mesma fórmula — só `REUNIOES_COMERCIAIS` não é replicado no segundo. Candidato a unificar numa próxima mexida nessa área.
