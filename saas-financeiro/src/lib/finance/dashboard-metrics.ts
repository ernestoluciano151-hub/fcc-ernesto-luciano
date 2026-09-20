import { prisma } from "@/lib/prisma";
import { add, sub, ZERO, money, type Money } from "@/lib/finance/money";
import { getCompanyBalanceByKind } from "@/lib/ledger/ledger-engine";
import type { LedgerAccountKind } from "@prisma/client";

// ============================================================================
// Todas as respostas do "critério final de aceitação" (secção 34) são
// calculadas AQUI, uma única vez, no backend — e reutilizadas por Dashboard,
// Relatórios e Analytics. Nunca recalculadas de forma diferente em cada ecrã.
// ============================================================================

export type Period = "today" | "week" | "month" | "3m" | "6m" | "year";

export function periodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }
}

/** Soma multi-moeda -> single number na moeda de referência, usando taxas mais recentes. */
export async function sumToReference(byCurrency: Map<string, Money>, referenceCurrency: string): Promise<Money> {
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
    if (rate) {
      total = add(total, amount.times(rate.rate.toString()));
    }
    // se não há taxa registada, o valor fica de fora do total consolidado
    // (evita inventar câmbio) — deve aparecer sinalizado na UI.
  }
  return total;
}

/**
 * companyId = undefined => visão consolidada de todas as empresas do utilizador.
 */
export async function getExecutiveDashboard(params: { companyIds?: string[]; referenceCurrency?: string }) {
  const referenceCurrency = params.referenceCurrency ?? "AOA";
  const companyFilter = params.companyIds?.length ? { companyId: { in: params.companyIds } } : {};

  const kinds: LedgerAccountKind[] = [
    "BANK_ACCOUNT",
    "WALLET",
    "WORKING_CAPITAL",
    "RESERVED_CAPITAL",
    "SAVINGS",
  ];

  const companies = params.companyIds?.length
    ? params.companyIds
    : (await prisma.company.findMany({ where: { isActive: true }, select: { id: true } })).map((c) => c.id);

  const balancesByKind: Record<string, Money> = {};
  for (const kind of kinds) {
    let acc = ZERO;
    for (const companyId of companies) {
      const byCurrency = await getCompanyBalanceByKind(companyId, kind);
      acc = add(acc, await sumToReference(byCurrency, referenceCurrency));
    }
    balancesByKind[kind] = acc;
  }

  const capitalDisponivel = add(balancesByKind.BANK_ACCOUNT ?? ZERO, balancesByKind.WALLET ?? ZERO);
  const capitalGiro = balancesByKind.WORKING_CAPITAL ?? ZERO;
  const capitalReservado = balancesByKind.RESERVED_CAPITAL ?? ZERO;
  const poupancas = balancesByKind.SAVINGS ?? ZERO;
  const capitalTotal = add(add(capitalDisponivel, capitalGiro), add(capitalReservado, poupancas));

  const now = new Date();
  const monthStart = periodStart("month");

  const [receitasMes, despesasMes, receivablesOpen, payablesOpen] = await Promise.all([
    prisma.revenue.aggregate({
      where: { ...companyFilter, occurredAt: { gte: monthStart, lte: now } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...companyFilter, occurredAt: { gte: monthStart, lte: now } },
      _sum: { amount: true },
    }),
    prisma.receivable.aggregate({
      where: { ...companyFilter, status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { amount: true, amountPaid: true },
    }),
    prisma.payable.aggregate({
      where: { ...companyFilter, status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { amount: true, amountPaid: true },
    }),
  ]);

  const receitas = money(receitasMes._sum.amount ?? 0);
  const despesas = money(despesasMes._sum.amount ?? 0);
  const resultadoMes = sub(receitas, despesas);
  const lucroMes = resultadoMes.isPositive() ? resultadoMes : ZERO;
  const prejuizoMes = resultadoMes.isNegative() ? resultadoMes.abs() : ZERO;

  const contasAReceber = sub(receivablesOpen._sum.amount ?? 0, receivablesOpen._sum.amountPaid ?? 0);
  const contasAPagar = sub(payablesOpen._sum.amount ?? 0, payablesOpen._sum.amountPaid ?? 0);

  const patrimonioOperacional = add(sub(capitalTotal, contasAPagar), contasAReceber);

  return {
    referenceCurrency,
    capitalTotal,
    capitalDisponivel,
    capitalGiro,
    capitalReservado,
    poupancas,
    receitasMes: receitas,
    despesasMes: despesas,
    lucroMes,
    prejuizoMes,
    margemMes: receitas.isZero() ? ZERO : resultadoMes.dividedBy(receitas).times(100),
    contasAReceber,
    contasAPagar,
    patrimonioOperacional,
  };
}

/** Resultado (P&L simplificado) por empresa, para ranking "qual empresa dá mais lucro". */
export async function getResultBycompany(referenceCurrency = "AOA") {
  const companies = await prisma.company.findMany({ where: { isActive: true } });
  const results = [];
  for (const company of companies) {
    const [revenue, expense] = await Promise.all([
      prisma.revenue.aggregate({ where: { companyId: company.id }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { companyId: company.id }, _sum: { amount: true } }),
    ]);
    const r = money(revenue._sum.amount ?? 0);
    const e = money(expense._sum.amount ?? 0);
    results.push({
      companyId: company.id,
      companyName: company.name,
      revenue: r,
      expense: e,
      profit: sub(r, e),
      margin: r.isZero() ? ZERO : sub(r, e).dividedBy(r).times(100),
    });
  }
  return results.sort((a, b) => b.profit.comparedTo(a.profit));
}

/** Previsão de caixa simples (extrapolação linear da média diária de entradas/saídas). */
export async function getCashFlowForecast(
  days: 7 | 30 | 60 | 90,
  companyIds?: string[],
  referenceCurrency = "AOA"
) {
  const companyFilter = companyIds?.length ? { companyId: { in: companyIds } } : {};
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [revenues30d, expenses30d] = await Promise.all([
    prisma.revenue.findMany({ where: { ...companyFilter, occurredAt: { gte: since } }, select: { amount: true, currency: true } }),
    prisma.expense.findMany({ where: { ...companyFilter, occurredAt: { gte: since } }, select: { amount: true, currency: true } }),
  ]);

  const revenueByCurrency = new Map<string, Money>();
  for (const r of revenues30d) revenueByCurrency.set(r.currency, add(revenueByCurrency.get(r.currency) ?? ZERO, r.amount.toString()));
  const expenseByCurrency = new Map<string, Money>();
  for (const e of expenses30d) expenseByCurrency.set(e.currency, add(expenseByCurrency.get(e.currency) ?? ZERO, e.amount.toString()));

  const revenue30dTotal = await sumToReference(revenueByCurrency, referenceCurrency);
  const expense30dTotal = await sumToReference(expenseByCurrency, referenceCurrency);

  const dailyInflow = revenue30dTotal.dividedBy(30);
  const dailyOutflow = expense30dTotal.dividedBy(30);
  const netDaily = sub(dailyInflow, dailyOutflow);

  return {
    horizonDays: days,
    referenceCurrency,
    projectedInflow: dailyInflow.times(days),
    projectedOutflow: dailyOutflow.times(days),
    projectedNet: netDaily.times(days),
  };
}
