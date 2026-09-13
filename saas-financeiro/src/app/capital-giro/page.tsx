import { prisma } from "@/lib/prisma";
import { getWorkingCapitalSummary } from "@/lib/finance/working-capital";
import { formatMoney } from "@/lib/finance/money";
import { MinCapitalForm } from "./form";

export const dynamic = "force-dynamic";

const CAPACIDADE_STYLE: Record<string, string> = {
  "Confortável": "bg-emerald-50 text-emerald-700",
  "Apertada": "bg-amber-50 text-amber-700",
  "Crítica": "bg-red-50 text-red-700",
};

export default async function CapitalGiroPage() {
  const [summary, companies] = await Promise.all([
    getWorkingCapitalSummary({}),
    prisma.company.findMany({ where: { isActive: true } }),
  ]);
  const cur = summary.referenceCurrency;

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Capital de Giro</h1>
      <p className="text-sm text-neutral-500">Tudo derivado do ledger e das operações em curso — nada digitado manualmente.</p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-6">
        <span className="text-sm font-medium text-neutral-500">Capacidade operacional atual:</span>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${CAPACIDADE_STYLE[summary.capacidade]}`}>{summary.capacidade}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Capital total" value={formatMoney(summary.capitalTotal, cur)} />
        <Card label="Capital disponível" value={formatMoney(summary.capitalDisponivel, cur)} />
        <Card label="Capital comprometido" value={formatMoney(summary.capitalComprometido, cur)} />
        <Card label="Capital em operações" value={formatMoney(summary.capitalEmOperacoes, cur)} />
        <Card label="Capital reservado" value={formatMoney(summary.capitalReservado, cur)} />
        <Card label="Capital livre" value={formatMoney(summary.capitalLivre, cur)} tone={summary.capitalLivre.isNegative() ? "negative" : "positive"} />
        <Card label="Capital necessário (média 3m)" value={formatMoney(summary.capitalNecessario, cur)} />
        <Card label="Capital mínimo recomendado" value={formatMoney(summary.capitalMinimoRecomendado, cur)} />
      </div>

      <div className="mt-8 max-w-md rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Definir capital mínimo recomendado por empresa</h2>
        <p className="mt-1 text-xs text-neutral-500">Usado para calcular a capacidade operacional e disparar alertas.</p>
        <div className="mt-4">
          <MinCapitalForm companies={companies.map((c) => ({ id: c.id, name: c.name, minRecommendedCapital: c.minRecommendedCapital.toString() }))} />
        </div>
      </div>
    </main>
  );
}

function Card({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
