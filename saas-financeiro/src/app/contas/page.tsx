import { prisma } from "@/lib/prisma";
import { listAccountsWithBalance } from "@/lib/finance/account-balance";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  BANK: "Conta bancária",
  DIGITAL_WALLET: "Carteira digital",
  CRYPTO_WALLET: "Carteira cripto",
  CASH: "Caixa",
  PAYMENT_ACCOUNT: "Conta de pagamento",
};

export default async function ContasPage() {
  const [accounts, companies] = await Promise.all([
    listAccountsWithBalance(),
    prisma.company.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Contas</h1>
          <p className="text-sm text-neutral-500">Contas bancárias, cash e contas de pagamento — saldo sempre derivado do ledger.</p>
        </div>
        <Link
          href="/contas/nova"
          className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500"
        >
          Nova conta
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Instituição</th>
              <th className="px-4 py-2 font-medium">Saldo atual</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 font-medium text-neutral-900">{a.name}</td>
                <td className="px-4 py-2">{a.company.name}</td>
                <td className="px-4 py-2">{TYPE_LABEL[a.type] ?? a.type}</td>
                <td className="px-4 py-2">{a.institution ?? "—"}</td>
                <td className={`px-4 py-2 tabular-nums font-medium ${a.balance.isNegative() ? "text-red-600" : "text-neutral-900"}`}>
                  {formatMoney(a.balance, a.currency)}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {a.status === "ACTIVE" ? "Ativa" : a.status}
                  </span>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Sem contas registadas.{" "}
                  {companies.length === 0 && "Cria primeiro uma empresa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
