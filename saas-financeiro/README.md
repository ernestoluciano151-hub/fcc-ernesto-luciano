# Financial Command Center

Sistema interno de gestão empresarial e financeira — multiempresa, multimoeda,
com ledger de dupla entrada como fonte única de verdade.

Ver **`/docs/FINANCIAL_ARCHITECTURE.md`** para a arquitetura completa, o
roadmap de fases (P0–P15) e a estratégia de ledger/segurança.

## Arrancar em desenvolvimento

Requisitos: Node.js 20+, PostgreSQL 14+ (local via Docker ou serviço gerido).

```bash
npm install

cp .env.example .env   # ajusta DATABASE_URL para o teu Postgres
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed        # cria utilizador admin@empresa.local / changeme123 e empresa exemplo

npm run dev
```

Abre http://localhost:3000/dashboard.

> Nota: `npx prisma generate` não corre no ambiente cloud usado para gerar
> este projeto porque a política de rede da sandbox bloqueia o download dos
> motores do Prisma. No teu computador isto é standard e funciona sem
> configuração adicional.

## Estrutura

```
prisma/schema.prisma        Schema completo (todas as entidades da secção 25)
prisma/seed.ts               Dados iniciais (moedas, utilizador admin, empresa exemplo)
src/lib/finance/money.ts     Motor de cálculo financeiro (Decimal.js, câmbio)
src/lib/ledger/ledger-engine.ts   Ledger de dupla entrada — fonte única de saldo
src/lib/finance/dashboard-metrics.ts  Todas as métricas do dashboard/relatórios
src/lib/auth/rbac.ts         Papéis e permissões
src/server/operations/       Server Actions — cada uma regista operação + ledger + auditoria
src/app/dashboard/page.tsx   Dashboard executivo (primeira versão, dados reais)
docs/FINANCIAL_ARCHITECTURE.md   Arquitetura, roadmap, estratégia de segurança
```

## Princípio de não-duplicação (secções 26 e 33 do pedido original)

Nunca escrever um saldo diretamente. Toda operação financeira passa por
`postLedgerBatch()`. Dashboard, P&L, Cash Flow e Analytics leem sempre a
mesma camada (`dashboard-metrics.ts`) — nunca recalculam de formas diferentes.
