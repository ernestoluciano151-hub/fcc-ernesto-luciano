import { prisma } from "@/lib/prisma";
import { NovaArbitragemForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovaArbitragemPage() {
  const [companies, customers] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Nova arbitragem cambial</h1>
      <p className="text-sm text-neutral-500">
        Lucro, margem e ROI são calculados automaticamente — nunca introduzidos manualmente.
      </p>

      <div className="mt-6 max-w-2xl rounded-xl border border-neutral-200 bg-white p-6">
        <NovaArbitragemForm
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
