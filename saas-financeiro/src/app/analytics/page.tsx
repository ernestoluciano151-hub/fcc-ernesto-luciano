import { getPerformanceScores } from "@/lib/finance/analytics";

export const dynamic = "force-dynamic";

const CLASS_STYLE: Record<string, string> = {
  "Excelente": "bg-emerald-50 text-emerald-700",
  "Bom": "bg-sky-50 text-sky-700",
  "Atenção": "bg-amber-50 text-amber-700",
  "Crítico": "bg-red-50 text-red-700",
};

function Bar({ pct, tone }: { pct: number; tone: "emerald" | "sky" | "amber" | "red" | "neutral" }) {
  const toneClass: Record<string, string> = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    neutral: "bg-neutral-400",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className={`h-full rounded-full ${toneClass[tone]}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function toneFor(score: number): "emerald" | "sky" | "amber" | "red" {
  if (score >= 80) return "emerald";
  if (score >= 60) return "sky";
  if (score >= 40) return "amber";
  return "red";
}

export default async function AnalyticsPage() {
  const scores = await getPerformanceScores();

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold text-neutral-900">Analytics — Score de Performance</h1>
      <p className="text-sm text-neutral-500">
        Ranking composto: margem (30%), capacidade de capital de giro (25%), crescimento de receita (20%),
        saúde de contas a receber (15%) e progresso de poupanças (10%) — recalculado sempre a partir dos dados já existentes.
      </p>

      <div className="mt-6 space-y-4">
        {scores.map((s, idx) => (
          <div key={s.companyId} className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-neutral-900">{s.companyName}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CLASS_STYLE[s.classification]}`}>
                    {s.classification}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-neutral-900">{s.score}<span className="text-sm text-neutral-400">/100</span></p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-neutral-500">Margem do mês</p>
                <p className="text-sm font-medium tabular-nums text-neutral-900">{s.breakdown.margin.value.toFixed(1)}%</p>
                <div className="mt-1"><Bar pct={s.breakdown.margin.score} tone={toneFor(s.breakdown.margin.score)} /></div>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Capital de giro</p>
                <p className="text-sm font-medium tabular-nums text-neutral-900">{(s.breakdown.workingCapital.ratio * 100).toFixed(0)}% do mínimo</p>
                <div className="mt-1"><Bar pct={s.breakdown.workingCapital.score} tone={toneFor(s.breakdown.workingCapital.score)} /></div>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Crescimento (MoM)</p>
                <p className="text-sm font-medium tabular-nums text-neutral-900">{s.breakdown.revenueGrowth.pct >= 0 ? "+" : ""}{s.breakdown.revenueGrowth.pct.toFixed(1)}%</p>
                <div className="mt-1"><Bar pct={s.breakdown.revenueGrowth.score} tone={toneFor(s.breakdown.revenueGrowth.score)} /></div>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Contas a receber vencidas</p>
                <p className="text-sm font-medium tabular-nums text-neutral-900">{(s.breakdown.receivablesHealth.overdueRatio * 100).toFixed(0)}%</p>
                <div className="mt-1"><Bar pct={s.breakdown.receivablesHealth.score} tone={toneFor(s.breakdown.receivablesHealth.score)} /></div>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Progresso de poupanças</p>
                <p className="text-sm font-medium tabular-nums text-neutral-900">{s.breakdown.savingsProgress.avgPct.toFixed(0)}%</p>
                <div className="mt-1"><Bar pct={s.breakdown.savingsProgress.score} tone={toneFor(s.breakdown.savingsProgress.score)} /></div>
              </div>
            </div>
          </div>
        ))}
        {scores.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-400">
            Sem empresas ativas para pontuar.
          </div>
        )}
      </div>
    </main>
  );
}
