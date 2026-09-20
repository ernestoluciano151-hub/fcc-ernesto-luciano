import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, percent } from "@/lib/finance/money";
import { PoupancaForm } from "./form";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  EMERGENCY_FUND: "Fundo de emergência",
  NEW_COMPANY_CAPITAL: "Capital para nova empresa",
  EQUIPMENT: "Equipamento",
  EXPANSION: "Expansão",
  INVESTMENT: "Investimento",
  PERSONAL: "Pessoal",
};

export default async function PoupancasPage() {
  const [goals, companies] = await Promise.all([
    prisma.savingsGoal.findMany({
      include: { company: true, contributions: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Poupanças</h1>
      <p className="text-sm text-neutral-500">
        Metas de poupança por empresa. Cada aporte sai de uma conta/carteira real e entra na reserva de poupança — nunca é digitado manualmente.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Nova meta</h2>
          <div className="mt-4">
            <PoupancaForm companies={companies.map((c) => ({ id: c.id, name: c.name, baseCurrency: c.baseCurrency }))} />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {goals.map((g) => {
            const progressPct = Math.min(100, percent(g.currentAmount.toString(), g.targetAmount.toString()).toNumber());
            return (
              <Link
                key={g.id}
                href={`/poupancas/${g.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{g.name}</p>
                    <p className="text-xs text-neutral-500">
                      {g.company.name} · {TYPE_LABEL[g.type] ?? g.type}
                      {g.targetDate ? ` · alvo: ${g.targetDate.toLocaleDateString("pt-PT")}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-medium text-neutral-900">{formatMoney(g.currentAmount, g.currency)}</p>
                    <p className="text-xs text-neutral-500">de {formatMoney(g.targetAmount, g.currency)}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-neutral-400">{progressPct.toFixed(0)}%</p>
              </Link>
            );
          })}
          {goals.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-400">
              Sem metas de poupança criadas.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
