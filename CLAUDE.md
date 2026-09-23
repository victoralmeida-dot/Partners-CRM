# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# EP Partners CRM — Contexto do projeto (leia antes de fazer qualquer alteração)

> **Instrução crítica pra você, Claude Code:** este é um projeto **já em produção de uso real**, com dados reais de uma pessoa (Victor, gestor de parcerias na Ecommerce Puro). O banco de dados local (`prisma/dev.db`) contém parceiros, indicações, metas e lançamentos reais que **não podem ser perdidos ou alterados** por refatoração, reset de schema, ou "limpeza de código".
>
> Regras que você deve seguir sempre, em qualquer tarefa:
> 1. **Nunca rode `prisma migrate reset`, delete `dev.db`, ou recrie o banco do zero.** Se uma mudança de schema for necessária, use `prisma db push` (que só aplica o diff) e, se possível, prefira migrações aditivas (novas colunas opcionais, novas tabelas) a mudanças destrutivas.
> 2. **Não refatore ou reescreva arquivos/páginas existentes** só por estilo ou "melhoria" — só mexa no que for explicitamente pedido. Este código foi construído incrementalmente ao longo de várias sessões; padrões repetidos (como formulários inline em cada página, em vez de componentes 100% compartilhados) são intencionais, não descuido.
> 3. **Antes de qualquer mudança de schema**, avise o que vai mudar e confirme.
> 4. **Nunca sugira deploy público** (Vercel, Netlify, etc.) sem antes alertar sobre exposição de dados — esse projeto é intencionalmente local-only, sem dado sensível exposto fora da máquina do usuário.
> 5. Sempre que alterar `prisma/schema.prisma`, gere também a migração equivalente em SQL puro (ALTER TABLE) caso o ambiente não tenha acesso de rede pra baixar os engines do Prisma — isso já aconteceu antes neste projeto.

---

## O que é o projeto

CRM interno de gestão de parcerias B2B para a **Ecommerce Puro** (empresa de educação/mentoria em e-commerce). Uso diário por um analista de parcerias, rodando **100% local** (sem deploy, sem nuvem) por decisão deliberada de segurança — dados de contrato, comissão e faturamento de parceiros/clientes não devem ficar expostos publicamente.

## Stack

- **Next.js 14** (App Router), TypeScript, React 18
- **Prisma + SQLite** (`prisma/dev.db`, um único arquivo local)
- **Tailwind CSS** com tema claro/escuro via CSS custom properties (ver `app/globals.css` e `tailwind.config.ts` — as cores (`ink`, `paper`, `surface`, `accent`, `amber`, `rose`, `line`) são `rgb(var(--c-x) / <alpha-value>)`, então **nunca hardcode cores hex** em componentes novos — sempre use os tokens existentes ou adicione uma nova CSS variable seguindo o mesmo padrão)
- **NextAuth (Auth.js v4)** com Credentials provider (e-mail/senha), sessão JWT, `bcryptjs` pro hash de senha
- Sem serviço de e-mail configurado — o recurso "Avisar parceiro" usa link `mailto:` (abre o cliente de e-mail do usuário, não envia nada automaticamente)

## Modelo de dados (prisma/schema.prisma)

| Model | Papel |
|---|---|
| `Partner` | Parceiro de negócio. Tem tier (referência a `Tier.nome`), status, ICP (faturamento min/max, segmento, características), cota de eventos contratados, contatos |
| `Indicacao` | Indicação de cliente/mentorado pra um parceiro. Tem contato completo (telefone/email/CNPJ/faturamento), `quemIndicou` (nome do consultor), status de funil (ENVIADA/NEGOCIACAO/CONVERTIDA/PERDIDA) |
| `Comissao` | 1:1 com Indicacao — valor, tipo (percentual/fixo), status de pagamento |
| `Acao` | Cronograma/follow-ups por parceiro (reunião, evento, ativação, etc.) |
| `ParticipacaoEvento` | Histórico de eventos que o parceiro participou (nome, data, palco/plateia, mailing). `status` inclui `CONVITE_ENVIADO` (convite pendente de aceite/recusa no Portal do Parceiro) além de PLANEJADO/REALIZADO/CANCELADO |
| `Meta` | Meta financeira da empresa (mensal/trimestral/anual), usada no dashboard geral |
| `Receita` | Lançamento de receita realizada (o "atingido" das metas), com origem (indicação/contrato/comissão/evento/outro) |
| `MetaParceiro` | Meta específica por parceiro (Leads Qualificados, Reuniões Comerciais), sempre mensal, com progresso calculado automaticamente a partir de `Indicacao` e `Acao` — não é lançamento manual |
| `User` | Login do sistema. `role`: ADMIN \| ANALISTA \| PARCEIRO. Se PARCEIRO, `partnerId` restringe o acesso só àquele parceiro (ver `middleware.ts`) |
| `Consultor` | Cadastro de consultores/mentores que podem "indicar" (nome, e-mail, telefone) — soft-delete via `ativo: false`, nunca hard-delete (indicações antigas continuam referenciando o nome) |
| `Tier` | Cadastro gerenciável dos níveis de parceria (Gold/Silver/Bronze + customizáveis), com `descricao` do que cada nível significa em entregas/expectativas |
| `NotaIndicacao` | Notas/comentários anexados a uma `Indicacao` — canal compartilhado entre admin e parceiro (Portal). `autor` (ADMIN\|PARCEIRO) + `lida` (true quando o lado que não escreveu já viu) alimentam a sinalização de nova mensagem |
| `Evento` | Cadastro do evento em si (nome, data, local) — 1:N com `ParticipacaoEvento` (vários parceiros podem participar do mesmo evento) |
| `AuditLog` | Trilha de auditoria (quem fez o quê, quando) — ver `lib/auditoria.ts`. `userNome` é gravado como texto solto (não FK) pra sobreviver à remoção do usuário |
| `OnboardingItem` | Checklist de onboarding por parceiro (item, ordem, concluído) — ver `lib/onboarding.ts` |
| `ConvidadoEvento` | Convidado trazido por um parceiro numa `ParticipacaoEvento` (nome, empresa, telefone, CPF, e-mail, faturamento) — um parceiro pode trazer vários convidados pro mesmo evento. `status` (PENDENTE\|APROVADO\|REJEITADO, + `motivoRejeicao`): convidado lançado direto pelo admin já nasce APROVADO; enviado pelo parceiro via Portal nasce PENDENTE e precisa de aprovação em `/eventos` |
| `EventoSerie` | Tema recorrente de evento (ex: "Imersão IA", "Importação Pura"). `Evento` referencia `serieId` + `edicao` (Int) — eventos sem série são "avulsos" |

Detalhes de cada model, relações e o histórico de por que cada um existe: [docs/modelo-dados.md](docs/modelo-dados.md). Decisões de arquitetura e o raciocínio por trás delas: [docs/decisoes.md](docs/decisoes.md). Regras de negócio (funil, comissão, tiers, metas, cota de eventos): [docs/regras-de-negocio.md](docs/regras-de-negocio.md).

**Padrão importante**: vários campos que "parecem" enum (tier, status, origem, tipo) são `String` no schema, não enum do Prisma — porque **SQLite não suporta enum nativo**. A validação de valores permitidos é feita no frontend/API, não no banco. Não tente "corrigir" isso pra enum.

## Estrutura de páginas (`app/`)

- `/` — Dashboard geral (KPIs, gráfico de metas do trimestre, indicações recentes, ranking de partners)
- `/partners` — Lista de parceiros em cards, busca por nome, importação CSV em massa
- `/partners/[slug]` — Ficha do parceiro: ICP, indicações, comissões, cronograma, eventos, metas do parceiro, onboarding (rota usa o `slug` do parceiro, não o `id` cru — ver `lib/slug.ts`)
- `/indicacoes` — Kanban de indicações (cores por status), stats, gestão de consultores, notas por indicação, botão "Avisar parceiro" (mailto)
- `/cronograma` — Ações/follow-ups agrupados por data
- `/eventos` — Cadastro de eventos e participação dos parceiros (palco/plateia, mailing)
- `/metas` — Metas da empresa (mensal/trimestral), gráfico comparativo, lançamentos de receita, importação CSV
- `/tiers` — Gestão dos níveis de parceria e suas descrições
- `/usuarios` — Gestão de usuários e papéis de acesso (só ADMIN)
- `/auditoria` — Trilha de auditoria de ações do sistema (só ADMIN)
- `/perfil` — Troca de senha do próprio usuário
- `/portal` — Portal do Parceiro (role `PARCEIRO`): visão própria e restrita (indicações, comissões, eventos, meta do mês), sem sidebar interna — dados vêm de `/api/portal/meus-dados`, que deriva o `partnerId` só da sessão, nunca de parâmetro de URL
- `/login`, `/definir-senha`, `/sem-acesso` — Telas fora do `AppShell` (sem sidebar)

## Autenticação e controle de acesso

- `middleware.ts` protege todas as rotas exceto `/login`. Usuários com `role: PARCEIRO` são redirecionados pra `/portal` (Portal do Parceiro) em qualquer outra rota — **esse papel já está pronto no código, mas por decisão do usuário, só é usado internamente por enquanto** (não é liberado pra parceiros externos de verdade ainda; isso depende de decisão futura sobre hospedagem, já que hoje o app roda só localmente).
- Login inicial padrão: `victor@ecommercepuro.com.br` — a senha provisória fica no `prisma/seed.ts` (deve ser trocada em `/perfil` no primeiro acesso).

## Convenções de código já estabelecidas

- Cada página com formulário usa `useState` local + `fetch` direto pras API routes — não há gerenciador de estado global (Redux/Zustand/etc.), e isso é intencional pra manter o projeto simples.
- Padrão de "cadastro gerenciável" (Consultor, Tier): lista + formulário de criação + edição inline + soft-delete (`ativo: false`), nunca delete físico quando há dados relacionados históricos.
- Padrão de meta com progresso automático (`Meta`/`MetaParceiro`): o valor "atingido" nunca é digitado manualmente — é sempre calculado a partir de outra tabela (`Receita`, `Indicacao`, `Acao`).
- Importação em massa (partners e receitas) é via upload de CSV parseado no client (função `parseCSV` local em cada página, sem lib externa).
- Cores de status/badges: ver `components/Badge.tsx`, que centraliza estilo por valor de string (ex: `"CONVERTIDA"`, `"ATIVO"`, `"GOLD"`). Ao adicionar um novo valor de status, adicione também o estilo correspondente ali.
- Toda ação de criar/atualizar/remover nas API routes deve chamar `registrarAuditoria()` (`lib/auditoria.ts`) — é o que alimenta `/auditoria`. Nunca deixe uma falha de auditoria quebrar a operação principal (o helper já engole erro e só loga).
- Formulário de criação (toggle "+ Novo X" / `showForm`) sempre renderiza **logo após o cabeçalho da página**, antes de qualquer bloco de filtro/estatística/gráfico — nunca depois. Abrir o botão deve mostrar o formulário sem precisar rolar a tela, não importa quantos painéis a página ganhe depois. (Corrigido em `/indicacoes` em 22/09/2026 — o form tinha ficado "preso" depois de Filtros + stats + rankings, que foram todos adicionados depois do form já existir.)
- URL do parceiro usa `slug` (`lib/slug.ts`), gerado a partir do nome com sufixo numérico em caso de colisão — nunca troque isso por rota baseada em `id`.
- **Campos de "data pura"** (sem hora real — vêm de `<input type="date">` e são guardados como meia-noite UTC: `Evento.data`, `Indicacao.data`, `Acao.dataPlanejada`, `Receita.data`) **sempre** precisam de `timeZone: "UTC"` no `Intl.DateTimeFormat` ao exibir, e comparação tipo "atrasado"/"já passou" sempre por string de calendário (`campo.slice(0,10) < hojeISO()`), nunca por instante exato (`new Date(a) < new Date(b)`). Sem isso, o fuso local (Brasil, UTC-3) faz o dia exibido/comparado voltar um dia. Não confundir com timestamps de verdade (`createdAt`, `concluidoEm`, `setupTokenExpira`) — esses têm hora real e devem ficar no fuso local, sem fixar UTC. Ver [docs/decisoes.md](docs/decisoes.md).

## Scripts úteis

```
npm run dev        # inicia o servidor local (http://localhost:3000)
npm run build      # build de produção (útil só pra checar que compila — o app roda via `dev`, não é deployado)
npm run start      # serve o build de produção localmente
npm run lint       # next lint
npm run db:push    # aplica mudanças de schema.prisma no dev.db (aditivo, seguro)
npm run db:seed    # popula dados iniciais (idempotente — usa upsert, não duplica)
npm run db:studio  # abre interface visual do banco (Prisma Studio)
```

Não há suíte de testes automatizados configurada neste projeto (sem Jest/Vitest/Playwright) — validação é manual via `npm run dev`.

## O que fazer quando receber uma nova tarefa

1. Leia este arquivo primeiro.
2. Se a tarefa envolver mudança de schema, explique o que vai mudar e **espere confirmação** antes de rodar `db:push`.
3. Se a tarefa for só uma nova feature/tela, siga os padrões já estabelecidos acima (não introduza uma lib nova de state management, ORM diferente, ou padrão de estilo diferente do Tailwind + tokens já definidos).
4. Nunca sugira mover o projeto pra um banco de produção, hospedagem, ou serviço de e-mail real sem que isso seja explicitamente pedido — o usuário já decidiu, conscientemente, manter tudo local por enquanto.
5. Sempre que uma mudança de schema envolver uma decisão de modelagem não óbvia (ex: campo solto vs. tabela relacionada), registre a decisão e o porquê em [docs/decisoes.md](docs/decisoes.md) como parte da própria tarefa — não deixe pra uma sessão de documentação separada.
