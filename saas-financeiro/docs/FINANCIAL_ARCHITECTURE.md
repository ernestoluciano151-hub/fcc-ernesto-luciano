# Financial Command Center — Arquitetura Financeira

> Documento de arquitetura (Fase P0). Base para todas as fases seguintes (P1–P15).

## 1. Resumo da auditoria

Não existia projeto de código anterior (workspace vazio, pasta de documentos do
utilizador vazia). Este é um projeto **greenfield**. Stack escolhida conforme
pedido: Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma + Tailwind +
shadcn/ui + React Hook Form + Zod + TanStack Query + Recharts + date-fns +
Auth.js (NextAuth) + Decimal.js.

## 2. Princípio fundamental: fonte única de verdade

Nenhum ecrã (Dashboard, Relatórios, Analytics) calcula valores financeiros de
forma independente. Todos consomem as mesmas funções em
`src/lib/finance/dashboard-metrics.ts`, que por sua vez derivam saldos de um
**ledger de dupla entrada** (`src/lib/ledger/ledger-engine.ts`). Isto elimina
por construção o risco descrito na secção 33 do pedido (dados isolados,
cálculos duplicados, saldos inconsistentes).

Fluxo de qualquer operação financeira (arbitragem, cartão, venda, despesa):

```
Formulário (Zod valida) 
   -> Server Action (src/server/operations/*)
      -> transação Prisma:
         1. cria Operation (entidade central)
         2. cria o registo específico (ArbitrageOperation, Sale, CardOperation...)
         3. chama postLedgerBatch(...) — lançamentos de dupla entrada equilibrados
         4. cria Revenue/Expense "espelho" (para filtros e relatórios por categoria)
         5. grava AuditLog
   -> Dashboard, P&L, Cash Flow, Capital de Giro, Analytics
      leem o ledger e as tabelas — nunca precisam de novo input do utilizador
```

## 3. Motor de ledger (dupla entrada)

Entidades: `LedgerAccount` (nó do plano de contas: BANK_ACCOUNT, WALLET,
WORKING_CAPITAL, RESERVED_CAPITAL, SAVINGS, RECEIVABLE, PAYABLE, REVENUE,
EXPENSE, EQUITY, CLEARING) e `LedgerEntry` (lançamento atómico DEBIT/CREDIT).

Regras impostas pelo motor (`postLedgerBatch`):
- Todo lote tem de somar debit = credit, **por moeda**.
- Nenhum código fora de `src/lib/ledger/` deve escrever diretamente um saldo.
- Saldo = `SUM(credit) - SUM(debit)` por `LedgerAccount`, sempre calculado on
  demand (`getLedgerAccountBalance`).
- Estornos nunca apagam — criam o lançamento inverso ligado ao original
  (`reverseLedgerEntry`), com `AuditLog` obrigatório.

## 4. Multimoeda e câmbio

`Currency` + `ExchangeRate` (histórico, nunca sobrescrito). Cada operação
guarda `currency` (moeda original) e, quando aplicável, `fxRateToReference` +
`referenceCurrency`. A conversão para consolidação (`convertCurrency` em
`src/lib/finance/money.ts`) usa sempre a taxa mais recente disponível até à
data da operação — nunca recalcula com a taxa de hoje um lançamento antigo.

## 5. Precisão financeira

Postgres: todos os campos monetários são `Decimal` (`@db.Decimal(24,6)` para
montantes, `Decimal(24,10)` para taxas de câmbio, `Decimal(9,4)` para
percentagens). TypeScript: `decimal.js` em toda a matemática financeira
(`src/lib/finance/money.ts`). **Nunca `number`/`float` para dinheiro.**

## 6. Estrutura de tabelas (schema completo)

Ver `prisma/schema.prisma` — cobre todas as entidades pedidas na secção 25,
mais o ledger:

`users`, `roles` (enum `Role`), `company_members` (RBAC por empresa),
`audit_logs`, `companies`, `currencies`, `exchange_rates`, `accounts`,
`wallets`, `ledger_accounts`, `ledger_entries`, `operations`,
`arbitrage_operations`, `card_operations`, `limit_allocations`,
`limit_usages`, `crypto_fiat_operations`, `sales`, `revenues`, `expenses`,
`budgets`, `savings_goals`, `savings_contributions`, `receivables`,
`payables`, `customers`, `reconciliations`, `documents`, `notifications`.

## 7. Estratégia de segurança

- **RBAC**: `SUPER_ADMIN > ADMIN > FINANCE > MANAGER > OPERATOR > VIEWER`,
  aplicado por empresa via `CompanyMember` e globalmente via `User.role`.
  Ver `src/lib/auth/rbac.ts` — `can(role, "APPROVE_OPERATION")` etc.
- **Auth**: Auth.js (NextAuth v5) com credenciais + 2FA (`twoFactorSecret` no
  `User`). Passwords sempre `bcrypt` hash, nunca texto plano.
- **Auditoria imutável**: toda alteração financeira grava `AuditLog`
  (quem, quando, IP/device, valor anterior/novo, motivo). Não existe
  `DELETE` de transações — apenas estorno/cancelamento/correção com histórico.
- **Dados sensíveis**: `CardOperation.cardToken` é uma referência interna
  tokenizada — o schema **não tem campos** para PAN, CVV, PIN, seed phrase ou
  chave privada. `CryptoFiatOperation.txId` guarda apenas o hash público da
  transação.
- **Validação**: Zod em todas as Server Actions antes de tocar na base de
  dados. Próximas fases adicionam rate limiting (middleware) e CSRF/XSS
  hardening padrão do Next.js + cabeçalhos de segurança.

## 8. Riscos técnicos identificados

1. **Escala do pedido** — este é um ERP financeiro completo. Esta entrega
   cobre P0 (arquitetura) e arranca P1 (schema + ledger engine + primeira
   fatia do dashboard). As restantes fases exigem trabalho contínuo.
2. **Sem PostgreSQL provisionado** — o projeto está pronto com
   `DATABASE_URL` de exemplo em `.env`; falta uma instância real (local via
   Docker, ou serviço gerido) antes de correr `prisma migrate dev`.
3. **Geração do Prisma Client** — não foi possível correr
   `npx prisma generate` neste ambiente cloud porque o download dos motores
   (`binaries.prisma.sh`) está bloqueado pela política de rede da sandbox.
   **No teu computador isto funciona normalmente** — basta correr
   `npm install && npx prisma generate` depois de copiares o projeto.
4. **Sem testes automáticos ainda** (P14) — a prioridade nesta fase foi ter
   um motor de cálculo correto e sem duplicação.

## 8b. Nota sobre migrações da base de dados

Como não foi possível correr `npx prisma generate`/`migrate dev` no ambiente
cloud (secção 8, ponto 3), o `build` do Vercel usa `prisma db push` em vez de
`prisma migrate deploy`: aplica o schema diretamente na base de dados a cada
deploy, sem histórico de migrações versionado. Funciona bem nesta fase
inicial, mas assim que possível corre localmente (no teu computador, com
`DATABASE_URL` a apontar para a mesma base):

```bash
npx prisma migrate dev --name init
```

Isto gera a pasta `prisma/migrations/`; depois disso muda o script `build`
de volta para `prisma migrate deploy && next build`, que é a prática correta
para produção (histórico auditável de alterações ao schema).

## 9. Fases (roadmap completo)

| Fase | Conteúdo | Estado |
|---|---|---|
| P0 | Arquitetura financeira (este documento) | ✅ Entregue |
| P1 | Schema Prisma completo + Ledger engine | ✅ Entregue (fundação) |
| P2 | Dashboard executivo com dados reais | 🔶 Primeira versão entregue |
| P3 | Contas + Carteiras (CRUD, reconciliação) | ✅ Entregue |
| P4 | Receitas + Despesas (CRUD completo, categorias, orçamento) | ✅ Entregue |
| P5 | Motor de Operações (formulários genéricos) | ✅ Entregue |
| P6 | Arbitragem (CRUD + UI) | ✅ Entregue |
| P7 | Cartões + Plafond/Limites | ✅ Entregue |
| P8 | Capital de Giro (indicador de capacidade operacional) | ⏳ Próxima |
| P9 | Poupanças (objetivos + contribuições) | ⏳ |
| P10 | P&L + Cash Flow (relatórios completos, previsão 7/30/60/90) | 🔶 Base entregue |
| P11 | Analytics (score de performance, ranking) | 🔶 Base entregue |
| P12 | Relatórios (PDF/Excel/CSV) | ⏳ |
| P13 | Auditoria + Segurança (2FA, rate limiting, CSRF) | 🔶 Base entregue |
| P14 | Testes (unitários, integração, E2E) | ⏳ |
| P15 | Production hardening | ⏳ |

## 10. Como continuar

```bash
cd saas-financeiro
npm install
npx prisma generate
npx prisma migrate dev --name init   # requer PostgreSQL a correr (ver DATABASE_URL em .env)
npm run dev
```

Este documento e o schema são a referência para todas as sessões seguintes —
qualquer nova funcionalidade deve encaixar neste modelo de dados e passar
pelo ledger engine, nunca duplicar cálculo de saldo.
