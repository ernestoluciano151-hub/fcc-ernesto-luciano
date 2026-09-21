import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCashFlowForecast } from "@/lib/finance/dashboard-metrics";
import { toCSV } from "@/lib/export/csv";
import { buildWorkbookBuffer } from "@/lib/export/xlsx";

const HORIZONS = [7, 30, 60, 90] as const;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "csv";
  const companyId = searchParams.get("companyId") || undefined;
  const companyIds = companyId ? [companyId] : undefined;

  const [company, ...forecasts] = await Promise.all([
    companyId ? prisma.company.findUnique({ where: { id: companyId } }) : null,
    ...HORIZONS.map((h) => getCashFlowForecast(h, companyIds)),
  ]);
  const scopeLabel = company ? company.name : "Todas as empresas";
  const referenceCurrency = forecasts[0]?.referenceCurrency ?? "AOA";

  const headers = ["Horizonte (dias)", "Entradas projetadas", "Saídas projetadas", "Saldo líquido", "Moeda"];
  const rows = forecasts.map((f) => [f.horizonDays, f.projectedInflow.toFixed(2), f.projectedOutflow.toFixed(2), f.projectedNet.toFixed(2), referenceCurrency]);

  const filename = `fluxo_caixa_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}`;

  if (format === "xlsx") {
    const buffer = buildWorkbookBuffer([{ name: "Fluxo de Caixa", headers, rows }]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = toCSV(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
