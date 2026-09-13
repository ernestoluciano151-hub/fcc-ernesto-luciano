import { prisma } from "@/lib/prisma";
import { NovaReceitaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovaReceitaPage() {
  const [companies, accounts, wallets] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true } }),
    prisma.account.findMany({ include: { ledgerAccount: true } }),
    prisma.wallet.findMany({ include: { ledgerAccount: true } }),
  ]);

  const destinations = [
    ...accounts.filter((a) => a.ledgerAccount).map((a) => ({
      ledgerAccountId: a.ledgerAccount!.id,
      label: `${a.name} (conta)`,
      companyId: a.companyId,
      currency: a.currency,
    })),
    ...wallets.filter((w) => w.ledgerAccount).map((w) => ({
      ledgerAccountId: w.ledgerAccount!.id,
      label: `${w.name} (carteira)`,
      companyId: w.companyId,
      currency: w.currency,
    })),
  ];

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Nova receita</h1>
      <p className="text-sm text-neutral-500">Entra logo no ledger, a somar ao saldo da conta/carteira escolhida.</p>
      <div className="mt-6 max-w-lg rounded-xl border border-neutral-200 bg-white p-6">
        <NovaReceitaForm companies={companies} destinations={destinations} />
      </div>
    </main>
  );
}
