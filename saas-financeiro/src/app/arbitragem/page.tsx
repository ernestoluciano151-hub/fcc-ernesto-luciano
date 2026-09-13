import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArbitragemPage() {
  const operations = await prisma.arbitrageOperation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { operation: { include: { company: true } } },
  });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Arbitragem cambial</h1>
          <p className="text-sm text-neutral-500">Cada registo cria uma Operação, atualiza o ledger e o Dashboard automaticamente.</p>
        </div>
        <Link href="/arbitragem/nova" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Nova arbitragem
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Par</th>
              <th className="px-4 py-2 font-medium">Capital</th>
              <th className="px-4 py-2 font-medium">Lucro líquido</th>
              <th className="px-4 py-2 font-medium">Margem</th>
              <th className="px-4 py-2 font-medium">ROI</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-neutral-700">{a.operation.code}</td>
                <td className="px-4 py-2">{a.operation.company.name}</td>
                <td className="px-4 py-2">{a.originCurrency} → {a.destCurrency}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(a.capitalUsed, a.originCurrency)}</td>
                <td className={`px-4 py-2 tabular-nums font-medium ${Number(a.netProfit) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatMoney(a.netProfit, a.originCurrency)}
                </td>
                <td className="px-4 py-2 tabular-nums">{Number(a.marginPercent).toFixed(1)}%</td>
                <td className="px-4 py-2 tabular-nums">{Number(a.roiPercent).toFixed(1)}%</td>
                <td className="px-4 py-2">{a.status}</td>
              </tr>
            ))}
            {operations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">Sem operações de arbitragem registadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
