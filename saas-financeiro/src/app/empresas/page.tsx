import { prisma } from "@/lib/prisma";
import { EmpresaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Empresas</h1>
      <p className="text-sm text-neutral-500">Os dados de cada empresa permanecem separados. O Dashboard consolida quando escolhido.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Nova empresa</h2>
          <div className="mt-4">
            <EmpresaForm />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">NIF</th>
                <th className="px-4 py-2 font-medium">Moeda base</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-4 py-2">{c.taxId ?? "—"}</td>
                  <td className="px-4 py-2">{c.baseCurrency}</td>
                  <td className="px-4 py-2">{c.isPersonal ? "Pessoal" : "Empresa"}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                    Sem empresas registadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
