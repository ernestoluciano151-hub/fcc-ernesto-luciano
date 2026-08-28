import { getExecutiveDashboard, getResultBycompany } from "@/lib/finance/dashboard-metrics";
import { formatMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

function Card({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  // Visão consolidada por omissão. Passar companyIds para filtrar por empresa.
  const [metrics, byCompany] = await Promise.all([
    getExecutiveDashboard({}),
    getResultBycompany(),
  ]);

  const cur = metrics.referenceCurrency;

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Financial Command Center</h1>
      <p className="text-sm text-neutral-500">Visão consolidada — todas as empresas</p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Capital total" value={formatMoney(metrics.capitalTotal, cur)} />
        <Card label="Capital disponível" value={formatMoney(metrics.capitalDisponivel, cur)} />
        <Card label="Capital de giro" value={formatMoney(metrics.capitalGiro, cur)} />
        <Card label="Poupanças" value={formatMoney(metrics.poupancas, cur)} />

        <Card label="Receitas (mês)" value={formatMoney(metrics.receitasMes, cur)} tone="positive" />
        <Card label="Despesas (mês)" value={formatMoney(metrics.despesasMes, cur)} tone="negative" />
        <Card
          label="Lucro do mês"
          value={formatMoney(metrics.lucroMes, cur)}
          tone={metrics.lucroMes.isZero() ? "default" : "positive"}
        />
        <Card
          label="Prejuízo do mês"
          value={formatMoney(metrics.prejuizoMes, cur)}
          tone={metrics.prejuizoMes.isZero() ? "default" : "negative"}
        />

        <Card label="Contas a receber" value={formatMoney(metrics.contasAReceber, cur)} />
        <Card label="Contas a pagar" value={formatMoney(metrics.contasAPagar, cur)} />
        <Card label="Património operacional" value={formatMoney(metrics.patrimonioOperacional, cur)} />
        <Card label="Margem do mês" value={`${metrics.margemMes.toFixed(1)}%`} />
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-neutral-900">Resultado por empresa</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Receita</th>
                <th className="px-4 py-2 font-medium">Despesa</th>
                <th className="px-4 py-2 font-medium">Lucro</th>
                <th className="px-4 py-2 font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {byCompany.map((row) => (
                <tr key={row.companyId} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{row.companyName}</td>
                  <td className="px-4 py-2 tabular-nums">{formatMoney(row.revenue, cur)}</td>
                  <td className="px-4 py-2 tabular-nums">{formatMoney(row.expense, cur)}</td>
                  <td className={`px-4 py-2 tabular-nums ${row.profit.isNegative() ? "text-red-600" : "text-emerald-600"}`}>
                    {formatMoney(row.profit, cur)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{row.margin.toFixed(1)}%</td>
                </tr>
              ))}
              {byCompany.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                    Sem empresas registadas ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
