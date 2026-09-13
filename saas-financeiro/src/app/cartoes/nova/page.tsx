import { prisma } from "@/lib/prisma";
import { NovoCartaoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovoCartaoPage() {
  const [companies, customers] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Novo carregamento de cartão</h1>
      <p className="text-sm text-neutral-500">Usa apenas um token/referência interna — nunca o número completo do cartão.</p>

      <div className="mt-6 max-w-lg rounded-xl border border-neutral-200 bg-white p-6">
        {customers.length === 0 ? (
          <p className="text-sm text-red-600">Cria primeiro um cliente em /clientes.</p>
        ) : (
          <NovoCartaoForm
            companies={companies.map((c) => ({ id: c.id, name: c.name }))}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          />
        )}
      </div>
    </main>
  );
}
