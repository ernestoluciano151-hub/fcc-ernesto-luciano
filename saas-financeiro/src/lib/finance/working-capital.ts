import { prisma } from "@/lib/prisma";
import { add, sub, ZERO, money, type Money } from "@/lib/finance/money";
import { getCompanyBalanceByKind } from "@/lib/ledger/ledger-engine";

// ============================================================================
// Capital de Giro (secção 12 do pedido). Todos os valores derivam do ledger
// e das tabelas — nada é digitado manualmente, exceto o "mínimo recomendado"
// que é uma política definida pelo utilizador por empresa.
// ============================================================================

async function sumToReference(byCurrency: Map<string, Money>, referenceCurrency: string): Promise<Money> {
  let total = ZERO;
  for (const [currency, amount] of byCurrency) {
    if (currency === referenceCurrency) {
      total = add(total, amount);
      continue;
    }
    const rate = await prisma.exchangeRate.findFirst({
      where: { fromCode: currency, toCode: referenceCurrency },
      orderBy: { effectiveAt: "desc" },
    });
    if (rate) total = add(total, amount.times(rate.rate.toString()));
  }
  return total;
}

export async function getWorkingCapitalSummary(params: { companyIds?: string[]; referenceCurrency?: string }) {
  const referenceCurrency = params.referenceCurrency ?? "AOA";
  const companies = params.companyIds?.length
    ? await prisma.company.findMany({ where: { id: { in: params.companyIds } } })
    : await prisma.company.findMany({ where: { isActive: true } });

  const companyFilter = params.companyIds?.length ? { companyId: { in: params.companyIds } } : {};

  let capitalDisponivel = ZERO;
  let capitalReservado = ZERO;
  for (const company of companies) {
    const [disponivelBank, disponivelWallet, reservado] = await Promise.all([
      getCompanyBalanceByKind(company.id, "BANK_ACCOUNT"),
      getCompanyBalanceByKind(company.id, "WALLET"),
      getCompanyBalanceByKind(company.id, "RESERVED_CAPITAL"),
    ]);
    capitalDisponivel = add(capitalDisponivel, await sumToReference(disponivelBank, referenceCurrency));
    capitalDisponivel = add(capitalDisponivel, await sumToReference(disponivelWallet, referenceCurrency));
    capitalReservado = add(capitalReservado, await sumToReference(reservado, referenceCurrency));
  }

  // Capital "em operações": capital ainda comprometido em operações não concluídas.
  const openOperations = await prisma.operation.findMany({
    where: { ...companyFilter, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    select: { capitalAmount: true, currency: true },
  });
  const byCurrency = new Map<string, Money>();
  for (const op of openOperations) {
    byCurrency.set(op.currency, add(byCurrency.get(op.currency) ?? ZERO, op.capitalAmount.toString()));
  }
  const capitalEmOperacoes = await sumToReference(byCurrency, referenceCurrency);

  const capitalComprometido = add(capitalReservado, capitalEmOperacoes);
  const capitalLivre = sub(capitalDisponivel, capitalComprometido);
  const capitalTotal = add(capitalDisponivel, add(capitalReservado, capitalEmOperacoes));

  // Capital necessário: média de despesas mensais dos últimos 3 meses (estimativa de "queima" mensal).
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const expenses = await prisma.expense.findMany({
    where: { ...companyFilter, occurredAt: { gte: threeMonthsAgo } },
    select: { amount: true, currency: true },
  });
  const expenseByCurrency = new Map<string, Money>();
  for (const e of expenses) {
    expenseByCurrency.set(e.currency, add(expenseByCurrency.get(e.currency) ?? ZERO, e.amount.toString()));
  }
  const totalExpenses3m = await sumToReference(expenseByCurrency, referenceCurrency);
  const capitalNecessario = totalExpenses3m.dividedBy(3);

  const capitalMinimoRecomendado = companies.reduce((acc, c) => add(acc, c.minRecommendedCapital.toString()), ZERO);

  // Indicador "Capacidade operacional atual"
  let capacidade: "Confortável" | "Apertada" | "Crítica" = "Confortável";
  if (capitalLivre.lessThan(capitalMinimoRecomendado)) capacidade = "Crítica";
  else if (capitalNecessario.greaterThan(ZERO) && capitalLivre.lessThan(capitalNecessario)) capacidade = "Apertada";

  return {
    referenceCurrency,
    capitalTotal,
    capitalDisponivel,
    capitalComprometido,
    capitalEmOperacoes,
    capitalReservado,
    capitalLivre,
    capitalNecessario,
    capitalMinimoRecomendado,
    capacidade,
  };
}
