import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import { getProfitAndLoss } from "@/lib/finance/reports";
import type { Period } from "@/lib/finance/dashboard-metrics";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoje",
  week: "Última semana",
  month: "Último mês",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  year: "Último ano",
};

const EXPENSE_LABEL: Record<string, string> = {
  OPERATIONAL: "Operacionais", MARKETING: "Marketing", ADVERTISING: "Publicidade", SALARIES: "Salários",
  TRANSPORT: "Transporte", COMMISSIONS: "Comissões", BANK_FEES: "Taxas bancárias", PLATFORM_FEES: "Taxas de plataformas",
  TECHNOLOGY: "Tecnologia", OFFICE: "Escritório", TAXES: "Impostos", SUPPLIERS: "Fornecedores",
  FINANCIAL: "Despesas financeiras", OTHER: "Outras",
};

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ period?: string; companyId?: string }> }) {
  const sp = await searchParams;
  const period = (["month", "3m", "6m", "year"].includes(sp.period ?? "") ? sp.period : "month") as Period;
  const companyIds = sp.companyId ? [sp.companyId] : undefined;

  const [companies, pl] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true } }),
    getProfitAndLoss({ companyIds, period }),
  ]);

  const cur = pl.referenceCurrency;

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Demonstração de Resultados (DRE)</h1>
          <p className="text-sm text-neutral-500">Receitas e despesas por categoria, derivadas diretamente dos lançamentos — nada digitado aqui.</p>
        </div>
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Empresa</label>
          <select name="companyId" defaultValue={sp.companyId ?? ""} className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Todas as empresas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Período</label>
          <select name="period" defaultValue={period} className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {(Object.keys(PERIOD_LABEL) as Period[]).filter((p) => ["month", "3m", "6m", "year"].includes(p)).map((p) => (
              <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Aplicar
        </button>
      </form>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Receita total</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600">{formatMoney(pl.totalRevenue, cur)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Despesa total</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-red-600">{formatMoney(pl.totalExpense, cur)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Resultado líquido</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${pl.grossProfit.isNegative() ? "text-red-600" : "text-emerald-600"}`}>
            {formatMoney(pl.grossProfit, cur)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Margem</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">{pl.margin.toFixed(1)}%</p>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Receitas por categoria</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {pl.revenueByCategory.map((r) => (
                <tr key={r.category} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 text-neutral-700">{r.category}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-emerald-600">{formatMoney(r.amount, cur)}</td>
                </tr>
              ))}
              {pl.revenueByCategory.length === 0 && (
                <tr><td colSpan={2} className="py-6 text-center text-neutral-400">Sem receitas no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Despesas por categoria</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {pl.expenseByCategory.map((r) => (
                <tr key={r.category} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 text-neutral-700">{EXPENSE_LABEL[r.category] ?? r.category}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-red-600">{formatMoney(r.amount, cur)}</td>
                </tr>
              ))}
              {pl.expenseByCategory.length === 0 && (
                <tr><td colSpan={2} className="py-6 text-center text-neutral-400">Sem despesas no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-neutral-900">Tendência (últimos 6 meses)</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Mês</th>
                <th className="px-4 py-2 font-medium">Receita</th>
                <th className="px-4 py-2 font-medium">Despesa</th>
                <th className="px-4 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {pl.monthlyTrend.map((t) => (
                <tr key={t.month} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 capitalize">{t.month}</td>
                  <td className="px-4 py-2 tabular-nums text-emerald-600">{formatMoney(t.revenue, cur)}</td>
                  <td className="px-4 py-2 tabular-nums text-red-600">{formatMoney(t.expense, cur)}</td>
                  <td className={`px-4 py-2 tabular-nums font-medium ${t.profit.isNegative() ? "text-red-600" : "text-emerald-600"}`}>
                    {formatMoney(t.profit, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
