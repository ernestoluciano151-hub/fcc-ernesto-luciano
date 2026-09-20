import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReceitasPage() {
  const revenues = await prisma.revenue.findMany({
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { company: true },
  });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Receitas</h1>
          <p className="text-sm text-neutral-500">Cada receita entra automaticamente no ledger e no Dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["csv", "xlsx"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/export/receitas?format=${fmt}`}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {fmt.toUpperCase()}
            </a>
          ))}
          <Link href="/receitas/nova" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Nova receita
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {revenues.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2">{r.occurredAt.toLocaleDateString("pt-PT")}</td>
                <td className="px-4 py-2">{r.company.name}</td>
                <td className="px-4 py-2">{r.description}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2 tabular-nums font-medium text-emerald-700">{formatMoney(r.amount, r.currency)}</td>
              </tr>
            ))}
            {revenues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Sem receitas registadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
