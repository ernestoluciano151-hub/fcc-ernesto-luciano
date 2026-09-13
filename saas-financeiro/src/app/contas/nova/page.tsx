import { prisma } from "@/lib/prisma";
import { NovaContaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovaContaPage() {
  const companies = await prisma.company.findMany({ where: { isActive: true } });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Nova conta</h1>
      <p className="text-sm text-neutral-500">
        Ao criar, é automaticamente aberta a conta correspondente no ledger — o saldo inicial (se houver) fica já registado como lançamento de abertura.
      </p>

      <div className="mt-6 max-w-lg rounded-xl border border-neutral-200 bg-white p-6">
        <NovaContaForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </main>
  );
}
