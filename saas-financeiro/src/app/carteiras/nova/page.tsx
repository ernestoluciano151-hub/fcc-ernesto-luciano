import { prisma } from "@/lib/prisma";
import { NovaCarteiraForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovaCarteiraPage() {
  const companies = await prisma.company.findMany({ where: { isActive: true } });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Nova carteira</h1>
      <div className="mt-6 max-w-lg rounded-xl border border-neutral-200 bg-white p-6">
        <NovaCarteiraForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </main>
  );
}
