# EP Partners CRM — Piloto Local

CRM interno de gestão de parcerias da Ecommerce Puro. Foco inicial: **visibilidade de indicações e comissões** + **cronograma de ações** por partner.

Este é um **piloto local** — projetado para rodar só na sua máquina, sem nenhuma exposição pública, para você validar o modelo antes de levar pro Andrey e discutir produção.

## Stack

- **Next.js 14** (App Router) — frontend + backend (API routes) no mesmo projeto
- **SQLite** local via **Prisma** — o banco é um arquivo `.db` na pasta `prisma/`, nunca sai da sua máquina
- **Tailwind CSS** para estilo

## Como rodar (primeira vez)

```bash
# 1. Instalar dependências
npm install

# 2. Criar o .env local (já vem uma cópia pronta, mas confirme que existe)
cp .env.example .env

# 3. Criar o banco de dados local (gera prisma/dev.db)
npm run db:push

# 4. Popular com os partners prioritários iniciais (opcional, só na primeira vez)
npm run db:seed

# 5. Rodar o projeto
npm run dev
```

Acesse **http://localhost:3000** no navegador. Isso é tudo — nada disso sobe pra internet.

## Como rodar (depois da primeira vez)

```bash
npm run dev
```

## O que já está funcionando

- **Dashboard** — indicações no mês, taxa de conversão, comissão pendente/paga, ranking de partners, próximas ações
- **Partners** — cadastro, **edição** (na ficha do partner), tier, status, categoria, tag de "acompanhamento próximo" e tag de "Mantenedor" (independente do status)
- **Importação em massa via CSV** — na página Partners, botão "Importar CSV". Se o nome do partner já existir, a linha atualiza em vez de duplicar
- **Ficha do partner** — indicações + comissões (com edição inline) + cronograma de ações, tudo na mesma tela
- **Kanban de indicações** — arrasta status entre Enviada → Negociação → Convertida/Perdida
- **Cronograma** — ações agrupadas por data, com filtro de planejadas/todas

## Estrutura do projeto

```
app/
  page.tsx                 → Dashboard de resultados
  partners/page.tsx        → Lista + cadastro de partners
  partners/[id]/page.tsx   → Ficha do partner (indicações, comissões, ações)
  indicacoes/page.tsx      → Kanban de indicações
  cronograma/page.tsx      → Cronograma de ações por data
  api/                     → Backend (API routes) — toda regra de negócio fica aqui

prisma/
  schema.prisma            → Modelo de dados
  seed.ts                  → Dados iniciais de exemplo

lib/prisma.ts              → Conexão com o banco
```

## Notas de segurança (aplicadas desde já)

- `.env` está no `.gitignore` — nunca vai pro controle de versão
- `prisma/dev.db` (o banco com seus dados reais) também está no `.gitignore`
- Não há nenhuma API key de terceiros neste piloto ainda — quando integrarmos o ClickUp (Fase 3 do roadmap), a chamada será feita **pelo backend** (API route), nunca direto do navegador, e o token ficará só no seu `.env` local
- **Antes de qualquer deploy público** (Vercel, Netlify, etc.), pare e revise: este projeto guarda dados de comissão e contatos de parceiros, que não deveriam ficar acessíveis publicamente sem autenticação. Se quiser compartilhar com o Andrey antes de decidir sobre produção, o caminho mais seguro é rodar local e compartilhar tela, ou gravar um vídeo curto — não subir o app.

## Roadmap (próximas fases)

1. ✅ **Fase 1** (este piloto): partners, indicações, comissões, dashboard
2. ✅ **Fase 2**: cronograma de ações (já incluso neste piloto)
3. **Fase 3**: integração de leitura com ClickUp (via backend, token em `.env`)
4. **Fase 4**: painel de saúde/alertas ("sem contato há X dias")

## Comandos úteis

```bash
npm run db:studio   # abre uma interface visual pra ver/editar o banco direto
```
