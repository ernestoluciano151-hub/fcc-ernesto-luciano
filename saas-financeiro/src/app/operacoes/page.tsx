import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ARBITRAGE_FX: "Arbitragem cambial",
  CARD_TOPUP: "Carregamento de cartão",
  CRYPTO_FIAT: "Cripto/Fiat",
  SALE: "Venda",
  EXPENSE: "Despesa",
  REVENUE: "Receita",
  TRANSFER: "Transferência",
  ADJUSTMENT: "Ajuste",
};

const STATUS_STYLE: Record<string, string> = {
  PLANNED: "bg-neutral-100 text-neutral-600",
  IN_PROGRESS: "bg-gold-100 text-gold-800",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-100 text-neutral-500",
  REVERSED: "bg-red-50 text-red-700",
};

export default async function OperacoesPage() {
  const operations = await prisma.operation.findMany({
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { company: true, customer: true },
  });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Operações</h1>
      <p className="text-sm text-neutral-500">
        Entidade central: toda movimentação financeira relevante (arbitragem, cartões, cripto, vendas) fica ligada a uma Operação.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Capital</th>
              <th className="px-4 py-2 font-medium">Lucro líquido</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-neutral-700">{op.code}</td>
                <td className="px-4 py-2">{TYPE_LABEL[op.type] ?? op.type}</td>
                <td className="px-4 py-2">{op.company.name}</td>
                <td className="px-4 py-2">{op.customer?.name ?? "—"}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(op.capitalAmount, op.currency)}</td>
                <td className={`px-4 py-2 tabular-nums font-medium ${Number(op.netProfit) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatMoney(op.netProfit, op.currency)}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[op.status] ?? ""}`}>{op.status}</span>
                </td>
                <td className="px-4 py-2">{op.occurredAt.toLocaleDateString("pt-PT")}</td>
              </tr>
            ))}
            {operations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">Sem operações registadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
