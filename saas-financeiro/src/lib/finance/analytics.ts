import { prisma } from "@/lib/prisma";
import { add, sub, ZERO, money, type Money } from "@/lib/finance/money";
import { getWorkingCapitalSummary } from "@/lib/finance/working-capital";
import { getProfitAndLoss } from "@/lib/finance/reports";
import { sumToReference } from "@/lib/finance/dashboard-metrics";

// ============================================================================
// Score de performance (secção 16 do pedido): um número único 0-100 por
// empresa, composto por 5 indicadores já calculados noutros módulos — nunca
// recalculados de forma diferente aqui, só combinados com pesos.
//
//   Margem do mês ................. 30%
//   Capacidade de capital de giro .. 25%
//   Crescimento de receita (MoM) ... 20%
//   Saúde de contas a receber ...... 15%
//   Progresso das metas de poupança  10%
// ============================================================================

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export type PerformanceScore = {
  companyId: string;
  companyName: string;
  score: number;
  classification: "Excelente" | "Bom" | "Atenção" | "Crítico";
  breakdown: {
    margin: { value: number; score: number };
    workingCapital: { ratio: number; score: number };
    revenueGrowth: { pct: number; score: number };
    receivablesHealth: { overdueRatio: number; score: number };
    savingsProgress: { avgPct: number; score: number };
  };
};

function classify(score: number): PerformanceScore["classification"] {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Atenção";
  return "Crítico";
}

export async function getPerformanceScores(referenceCurrency = "AOA"): Promise<PerformanceScore[]> {
  const companies = await prisma.company.findMany({ where: { isActive: true } });
  const results: PerformanceScore[] = [];

  for (const company of companies) {
    const companyIds = [company.id];

    // 1. Margem do mês.
    const pl = await getProfitAndLoss({ companyIds, period: "month", referenceCurrency });
    const marginValue = pl.margin.toNumber();
    const marginScore = clamp(marginValue, 0, 100);

    // 2. Capacidade de capital de giro (capital livre / mínimo recomendado).
    const capital = await getWorkingCapitalSummary({ companyIds, referenceCurrency });
    const capitalRatio = capital.capitalMinimoRecomendado.isZero()
      ? 1
      : capital.capitalLivre.dividedBy(capital.capitalMinimoRecomendado).toNumber();
    const capitalScore = clamp(capitalRatio, 0, 1) * 100;

    // 3. Crescimento de receita (mês atual vs mês anterior, via tendência de 6 meses).
    const trend = pl.monthlyTrend;
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    let growthPct = 0;
    if (previous && !previous.revenue.isZero()) {
      growthPct = current.revenue.minus(previous.revenue).dividedBy(previous.revenue).times(100).toNumber();
    } else if (current && !current.revenue.isZero()) {
      growthPct = 100; // arrancou do zero — crescimento máximo simbólico
    }
    const growthScore = clamp((clamp(growthPct, -50, 50) + 50), 0, 100);

    // 4. Saúde de contas a receber (quanto menor a fração vencida, melhor).
    const [openReceivables, overdueReceivables] = await Promise.all([
      prisma.receivable.findMany({ where: { companyId: company.id, status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } }, select: { amount: true, amountPaid: true, currency: true } }),
      prisma.receivable.findMany({ where: { companyId: company.id, status: "OVERDUE" }, select: { amount: true, amountPaid: true, currency: true } }),
    ]);
    const openByCurrency = new Map<string, Money>();
    for (const r of openReceivables) openByCurrency.set(r.currency, add(openByCurrency.get(r.currency) ?? ZERO, sub(r.amount.toString(), r.amountPaid.toString())));
    const overdueByCurrency = new Map<string, Money>();
    for (const r of overdueReceivables) overdueByCurrency.set(r.currency, add(overdueByCurrency.get(r.currency) ?? ZERO, sub(r.amount.toString(), r.amountPaid.toString())));
    const openTotal = await sumToReference(openByCurrency, referenceCurrency);
    const overdueTotal = await sumToReference(overdueByCurrency, referenceCurrency);
    const overdueRatio = openTotal.isZero() ? 0 : clamp(overdueTotal.dividedBy(openTotal).toNumber(), 0, 1);
    const receivablesScore = (1 - overdueRatio) * 100;

    // 5. Progresso médio das metas de poupança (neutro quando não há metas definidas).
    const goals = await prisma.savingsGoal.findMany({ where: { companyId: company.id }, select: { currentAmount: true, targetAmount: true } });
    let savingsAvgPct = 0;
    let savingsScore = 70;
    if (goals.length > 0) {
      const pcts = goals.map((g) => {
        const target = money(g.targetAmount.toString());
        if (target.isZero()) return 100;
        return clamp(money(g.currentAmount.toString()).dividedBy(target).times(100).toNumber(), 0, 100);
      });
      savingsAvgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      savingsScore = savingsAvgPct;
    }

    const score =
      marginScore * 0.3 +
      capitalScore * 0.25 +
      growthScore * 0.2 +
      receivablesScore * 0.15 +
      savingsScore * 0.1;

    results.push({
      companyId: company.id,
      companyName: company.name,
      score: Math.round(score),
      classification: classify(score),
      breakdown: {
        margin: { value: marginValue, score: Math.round(marginScore) },
        workingCapital: { ratio: capitalRatio, score: Math.round(capitalScore) },
        revenueGrowth: { pct: growthPct, score: Math.round(growthScore) },
        receivablesHealth: { overdueRatio, score: Math.round(receivablesScore) },
        savingsProgress: { avgPct: savingsAvgPct, score: Math.round(savingsScore) },
      },
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
