import { prisma } from "@/lib/prisma";
import { formatMoney, money, sub } from "@/lib/finance/money";
import { NovoLimiteForm } from "./form";
import { UsoLimiteForm } from "./usage-form";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXHAUSTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-neutral-100 text-neutral-500",
  CANCELLED: "bg-neutral-100 text-neutral-500",
};
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Ativo", EXHAUSTED: "Esgotado", EXPIRED: "Expirado", CANCELLED: "Cancelado" };

export default async function PlafondPage() {
  const [allocations, customers] = await Promise.all([
    prisma.limitAllocation.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.customer.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Plafond / Limite operacional</h1>
      <p className="text-sm text-neutral-500">
        Apenas gestão e registo — o sistema nunca executa operações automaticamente com base num limite.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Novo limite</h2>
            <div className="mt-4">
              <NovoLimiteForm customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Registar utilização</h2>
            <div className="mt-4">
              <UsoLimiteForm
                allocations={allocations
                  .filter((a) => a.status === "ACTIVE")
                  .map((a) => ({ id: a.id, label: `${a.customer.name} — ${formatMoney(a.limitAmount, a.currency)}` }))}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Limite</th>
                <th className="px-4 py-2 font-medium">Utilizado</th>
                <th className="px-4 py-2 font-medium">Disponível</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const available = sub(a.limitAmount, a.usedAmount);
                const pct = money(a.limitAmount).isZero() ? 0 : money(a.usedAmount).dividedBy(a.limitAmount).times(100).toNumber();
                return (
                  <tr key={a.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2">{a.customer.name}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(a.limitAmount, a.currency)}</td>
                    <td className="px-4 py-2">
                      <div className="tabular-nums">{formatMoney(a.usedAmount, a.currency)}</div>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-neutral-100">
                        <div className="h-1.5 rounded-full bg-gold-600" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(available, a.currency)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                  </tr>
                );
              })}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Sem limites registados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
