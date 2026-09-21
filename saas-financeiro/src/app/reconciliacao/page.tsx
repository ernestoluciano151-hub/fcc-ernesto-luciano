import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import { ReconciliationForm } from "./form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  RECONCILED: { label: "Conciliado", className: "bg-emerald-50 text-emerald-700" },
  DIFFERENCE_FOUND: { label: "Diferença encontrada", className: "bg-red-50 text-red-700" },
  UNDER_REVIEW: { label: "Em análise", className: "bg-gold-100 text-gold-800" },
};

export default async function ReconciliacaoPage() {
  const [accounts, reconciliations] = await Promise.all([
    prisma.account.findMany({ where: { status: "ACTIVE" }, include: { company: true } }),
    prisma.reconciliation.findMany({
      orderBy: { reconciledAt: "desc" },
      take: 20,
      include: { account: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Reconciliação</h1>
      <p className="text-sm text-neutral-500">
        Compara o saldo do sistema (ledger) com o saldo real da conta. Nunca corrige automaticamente — só regista a diferença.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold text-neutral-900">Nova reconciliação</h2>
          <div className="mt-4">
            <ReconciliationForm
              accounts={accounts.map((a) => ({ id: a.id, name: a.name, companyId: a.companyId, companyName: a.company.name }))}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Conta</th>
                <th className="px-4 py-2 font-medium">Sistema</th>
                <th className="px-4 py-2 font-medium">Real</th>
                <th className="px-4 py-2 font-medium">Diferença</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r) => {
                const status = STATUS_LABEL[r.status];
                return (
                  <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2">{r.account.name}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.systemBalance, r.account.currency)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatMoney(r.realBalance, r.account.currency)}</td>
                    <td className={`px-4 py-2 tabular-nums ${Number(r.difference) !== 0 ? "text-red-600" : ""}`}>
                      {formatMoney(r.difference, r.account.currency)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status?.className}`}>{status?.label ?? r.status}</span>
                    </td>
                  </tr>
                );
              })}
              {reconciliations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                    Sem reconciliações registadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
