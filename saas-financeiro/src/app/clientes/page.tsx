import { prisma } from "@/lib/prisma";
import { ClienteForm } from "./form";

export const dynamic = "force-dynamic";

const RISK_STYLE: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-red-50 text-red-700",
};

const RISK_LABEL: Record<string, string> = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto" };

export default async function ClientesPage() {
  const [customers, companies] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      include: {
        company: true,
        sales: true,
        operations: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findMany({ where: { isActive: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Clientes</h1>
      <p className="text-sm text-neutral-500">CRM financeiro — total movimentado e risco por cliente.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Novo cliente</h2>
          <div className="mt-4">
            <ClienteForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Contacto</th>
                <th className="px-4 py-2 font-medium">Operações</th>
                <th className="px-4 py-2 font-medium">Risco</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-4 py-2">{c.company.name}</td>
                  <td className="px-4 py-2">{c.contact ?? "—"}</td>
                  <td className="px-4 py-2 tabular-nums">{c.operations.length + c.sales.length}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STYLE[c.risk]}`}>{RISK_LABEL[c.risk]}</span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Sem clientes registados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
