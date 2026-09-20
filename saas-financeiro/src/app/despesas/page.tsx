import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  OPERATIONAL: "Operacionais",
  MARKETING: "Marketing",
  ADVERTISING: "Publicidade",
  SALARIES: "Salários",
  TRANSPORT: "Transporte",
  COMMISSIONS: "Comissões",
  BANK_FEES: "Taxas bancárias",
  PLATFORM_FEES: "Taxas de plataformas",
  TECHNOLOGY: "Tecnologia",
  OFFICE: "Escritório",
  TAXES: "Impostos",
  SUPPLIERS: "Fornecedores",
  FINANCIAL: "Despesas financeiras",
  OTHER: "Outras",
};

export default async function DespesasPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { occurredAt: "desc" },
    take: 50,
    include: { company: true, responsible: true },
  });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Despesas</h1>
          <p className="text-sm text-neutral-500">Cada despesa sai automaticamente da conta escolhida no ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["csv", "xlsx"] as const).map((fmt) => (
            <a
              key={fmt}
              href={`/api/export/despesas?format=${fmt}`}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {fmt.toUpperCase()}
            </a>
          ))}
          <Link href="/despesas/nova" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Nova despesa
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
              <th className="px-4 py-2 font-medium">Responsável</th>
              <th className="px-4 py-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2">{e.occurredAt.toLocaleDateString("pt-PT")}</td>
                <td className="px-4 py-2">{e.company.name}</td>
                <td className="px-4 py-2">{e.description}</td>
                <td className="px-4 py-2">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                <td className="px-4 py-2">{e.responsible.name}</td>
                <td className="px-4 py-2 tabular-nums font-medium text-red-600">{formatMoney(e.amount, e.currency)}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sem despesas registadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
