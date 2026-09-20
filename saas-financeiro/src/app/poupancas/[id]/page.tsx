import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, percent } from "@/lib/finance/money";
import { AporteForm } from "./form";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  EMERGENCY_FUND: "Fundo de emergência",
  NEW_COMPANY_CAPITAL: "Capital para nova empresa",
  EQUIPMENT: "Equipamento",
  EXPANSION: "Expansão",
  INVESTMENT: "Investimento",
  PERSONAL: "Pessoal",
};

export default async function PoupancaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const goal = await prisma.savingsGoal.findUnique({
    where: { id },
    include: {
      company: true,
      contributions: { orderBy: { contributedAt: "desc" } },
    },
  });
  if (!goal) notFound();

  const [accounts, wallets] = await Promise.all([
    prisma.account.findMany({ where: { companyId: goal.companyId, currency: goal.currency }, include: { ledgerAccount: true } }),
    prisma.wallet.findMany({ where: { companyId: goal.companyId, currency: goal.currency }, include: { ledgerAccount: true } }),
  ]);

  const sources = [
    ...accounts.filter((a) => a.ledgerAccount).map((a) => ({
      ledgerAccountId: a.ledgerAccount!.id,
      label: `${a.name} (conta)`,
      currency: a.currency,
    })),
    ...wallets.filter((w) => w.ledgerAccount).map((w) => ({
      ledgerAccountId: w.ledgerAccount!.id,
      label: `${w.name} (carteira)`,
      currency: w.currency,
    })),
  ];

  const progressPct = Math.min(100, percent(goal.currentAmount.toString(), goal.targetAmount.toString()).toNumber());

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <Link href="/poupancas" className="text-sm text-neutral-500 hover:text-neutral-800">← Poupanças</Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{goal.name}</h1>
          <p className="text-sm text-neutral-500">
            {goal.company.name} · {TYPE_LABEL[goal.type] ?? goal.type}
            {goal.targetDate ? ` · alvo: ${goal.targetDate.toLocaleDateString("pt-PT")}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-neutral-900">{formatMoney(goal.currentAmount, goal.currency)}</p>
          <p className="text-xs text-neutral-500">de {formatMoney(goal.targetAmount, goal.currency)} ({progressPct.toFixed(0)}%)</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Registar aporte / retirada</h2>
          <div className="mt-4">
            <AporteForm savingsGoalId={goal.id} sources={sources} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Nota</th>
                <th className="px-4 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {goal.contributions.map((c) => {
                const isWithdrawal = c.amount.toString().startsWith("-");
                return (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2">{c.contributedAt.toLocaleDateString("pt-PT")}</td>
                    <td className="px-4 py-2">{c.note ?? "—"}</td>
                    <td className={`px-4 py-2 tabular-nums font-medium ${isWithdrawal ? "text-red-600" : "text-emerald-600"}`}>
                      {isWithdrawal ? "−" : "+"}{formatMoney(c.amount.toString().replace("-", ""), goal.currency)}
                    </td>
                  </tr>
                );
              })}
              {goal.contributions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">Sem movimentos ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
