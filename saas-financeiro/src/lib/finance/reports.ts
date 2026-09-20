import { prisma } from "@/lib/prisma";
import { add, sub, ZERO, money, type Money } from "@/lib/finance/money";
import { periodStart, sumToReference, type Period } from "@/lib/finance/dashboard-metrics";

// ============================================================================
// Relatórios completos (secção 15 do pedido): DRE por categoria + tendência
// mensal, e Fluxo de Caixa projetado. Tudo derivado de Revenue/Expense —
// nada é digitado de novo aqui, é sempre o mesmo dado das secções 10/11.
// ============================================================================

export type PLCategoryRow = { category: string; amount: Money };

export type ProfitAndLoss = {
  referenceCurrency: string;
  period: Period;
  from: Date;
  to: Date;
  revenueByCategory: PLCategoryRow[];
  expenseByCategory: PLCategoryRow[];
  totalRevenue: Money;
  totalExpense: Money;
  grossProfit: Money;
  margin: Money;
  monthlyTrend: { month: string; revenue: Money; expense: Money; profit: Money }[];
};

export async function getProfitAndLoss(params: {
  companyIds?: string[];
  period?: Period;
  referenceCurrency?: string;
}): Promise<ProfitAndLoss> {
  const period = params.period ?? "month";
  const referenceCurrency = params.referenceCurrency ?? "AOA";
  const companyFilter = params.companyIds?.length ? { companyId: { in: params.companyIds } } : {};
  const from = periodStart(period);
  const to = new Date();

  const [revenues, expenses] = await Promise.all([
    prisma.revenue.findMany({ where: { ...companyFilter, occurredAt: { gte: from, lte: to } }, select: { category: true, amount: true, currency: true } }),
    prisma.expense.findMany({ where: { ...companyFilter, occurredAt: { gte: from, lte: to } }, select: { category: true, amount: true, currency: true } }),
  ]);

  async function groupByCategory(rows: { category: string; amount: unknown; currency: string }[]) {
    const byCategory = new Map<string, Map<string, Money>>();
    for (const r of rows) {
      const byCurrency = byCategory.get(r.category) ?? new Map<string, Money>();
      byCurrency.set(r.currency, add(byCurrency.get(r.currency) ?? ZERO, money((r.amount as { toString(): string }).toString())));
      byCategory.set(r.category, byCurrency);
    }
    const result: PLCategoryRow[] = [];
    for (const [category, byCurrency] of byCategory) {
      result.push({ category, amount: await sumToReference(byCurrency, referenceCurrency) });
    }
    return result.sort((a, b) => b.amount.comparedTo(a.amount));
  }

  const revenueByCategory = await groupByCategory(revenues);
  const expenseByCategory = await groupByCategory(expenses);

  const totalRevenue = revenueByCategory.reduce((acc, r) => add(acc, r.amount), ZERO);
  const totalExpense = expenseByCategory.reduce((acc, r) => add(acc, r.amount), ZERO);
  const grossProfit = sub(totalRevenue, totalExpense);
  const margin = totalRevenue.isZero() ? ZERO : grossProfit.dividedBy(totalRevenue).times(100);

  // Tendência dos últimos 6 meses fechados (independente do período selecionado acima).
  const monthlyTrend: ProfitAndLoss["monthlyTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setMonth(monthStart.getMonth() - i);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [revAgg, expAgg] = await Promise.all([
      prisma.revenue.findMany({ where: { ...companyFilter, occurredAt: { gte: monthStart, lt: monthEnd } }, select: { amount: true, currency: true } }),
      prisma.expense.findMany({ where: { ...companyFilter, occurredAt: { gte: monthStart, lt: monthEnd } }, select: { amount: true, currency: true } }),
    ]);
    const revByCurrency = new Map<string, Money>();
    for (const r of revAgg) revByCurrency.set(r.currency, add(revByCurrency.get(r.currency) ?? ZERO, r.amount.toString()));
    const expByCurrency = new Map<string, Money>();
    for (const e of expAgg) expByCurrency.set(e.currency, add(expByCurrency.get(e.currency) ?? ZERO, e.amount.toString()));

    const revenue = await sumToReference(revByCurrency, referenceCurrency);
    const expense = await sumToReference(expByCurrency, referenceCurrency);
    monthlyTrend.push({
      month: monthStart.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" }),
      revenue,
      expense,
      profit: sub(revenue, expense),
    });
  }

  return { referenceCurrency, period, from, to, revenueByCategory, expenseByCategory, totalRevenue, totalExpense, grossProfit, margin, monthlyTrend };
}
