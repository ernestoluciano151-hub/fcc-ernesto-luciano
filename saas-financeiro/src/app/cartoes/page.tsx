import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CartoesPage() {
  const cards = await prisma.cardOperation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { customer: true, operation: { include: { company: true } } },
  });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Carregamento de cartões</h1>
          <p className="text-sm text-neutral-500">Apenas referências/tokens internos — nunca números completos, CVV ou PIN.</p>
        </div>
        <Link href="/cartoes/nova" className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500">
          Novo carregamento
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Rede</th>
              <th className="px-4 py-2 font-medium">Token</th>
              <th className="px-4 py-2 font-medium">Carregado</th>
              <th className="px-4 py-2 font-medium">Recebido</th>
              <th className="px-4 py-2 font-medium">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-neutral-700">{c.operation.code}</td>
                <td className="px-4 py-2">{c.customer.name}</td>
                <td className="px-4 py-2">{c.network}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.cardToken}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(c.loadedAmount, c.currency)}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(c.receivedAmount, c.currency)}</td>
                <td className={`px-4 py-2 tabular-nums font-medium ${Number(c.profit) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatMoney(c.profit, c.currency)}
                </td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-400">Sem carregamentos registados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
