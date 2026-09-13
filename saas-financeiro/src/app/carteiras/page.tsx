import { prisma } from "@/lib/prisma";
import { listWalletsWithBalance } from "@/lib/finance/account-balance";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CarteirasPage() {
  const [wallets, companies] = await Promise.all([
    listWalletsWithBalance(),
    prisma.company.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Carteiras</h1>
          <p className="text-sm text-neutral-500">Carteiras digitais e de ativos digitais (ex: USDT).</p>
        </div>
        <Link
          href="/carteiras/nova"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Nova carteira
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Cripto?</th>
              <th className="px-4 py-2 font-medium">Saldo atual</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 font-medium text-neutral-900">{w.name}</td>
                <td className="px-4 py-2">{w.company.name}</td>
                <td className="px-4 py-2">{w.isCrypto ? "Sim" : "Não"}</td>
                <td className="px-4 py-2 tabular-nums font-medium">{formatMoney(w.balance, w.currency)}</td>
              </tr>
            ))}
            {wallets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  Sem carteiras registadas. {companies.length === 0 && "Cria primeiro uma empresa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
