import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import { getCashFlowForecast } from "@/lib/finance/dashboard-metrics";

export const dynamic = "force-dynamic";

const HORIZONS = [7, 30, 60, 90] as const;

export default async function FluxoCaixaPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const sp = await searchParams;
  const companyIds = sp.companyId ? [sp.companyId] : undefined;

  const [companies, ...forecasts] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true } }),
    ...HORIZONS.map((h) => getCashFlowForecast(h, companyIds)),
  ]);

  const referenceCurrency = forecasts[0]?.referenceCurrency ?? "AOA";

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Fluxo de Caixa Projetado</h1>
          <p className="text-sm text-neutral-500">
            Extrapolação linear da média diária de entradas e saídas dos últimos 30 dias — não é uma promessa, é uma projeção.
          </p>
        </div>
        <div className="flex gap-2">
          {(["csv", "xlsx"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/export/fluxo-caixa?format=${fmt}${sp.companyId ? `&companyId=${sp.companyId}` : ""}`}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {fmt.toUpperCase()}
            </a>
          ))}
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
        <button type="submit" className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500">
          Aplicar
        </button>
      </form>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {forecasts.map((f) => (
          <div key={f.horizonDays} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm font-medium text-neutral-500">Próximos {f.horizonDays} dias</p>
            <p className="mt-2 text-xs text-neutral-500">Entradas projetadas</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(f.projectedInflow, referenceCurrency)}</p>
            <p className="mt-2 text-xs text-neutral-500">Saídas projetadas</p>
            <p className="text-lg font-semibold tabular-nums text-red-600">{formatMoney(f.projectedOutflow, referenceCurrency)}</p>
            <p className="mt-2 text-xs text-neutral-500">Saldo líquido</p>
            <p className={`text-lg font-semibold tabular-nums ${f.projectedNet.isNegative() ? "text-red-600" : "text-emerald-600"}`}>
              {formatMoney(f.projectedNet, referenceCurrency)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
