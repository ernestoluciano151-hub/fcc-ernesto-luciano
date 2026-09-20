import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfitAndLoss } from "@/lib/finance/reports";
import type { Period } from "@/lib/finance/dashboard-metrics";
import { toCSV } from "@/lib/export/csv";
import { buildWorkbookBuffer } from "@/lib/export/xlsx";
import { buildDrePdf } from "@/lib/export/pdf";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "csv";
  const period = (["month", "3m", "6m", "year"].includes(searchParams.get("period") ?? "") ? searchParams.get("period") : "month") as Period;
  const companyId = searchParams.get("companyId") || undefined;
  const companyIds = companyId ? [companyId] : undefined;

  const [pl, company] = await Promise.all([
    getProfitAndLoss({ companyIds, period }),
    companyId ? prisma.company.findUnique({ where: { id: companyId } }) : null,
  ]);
  const scopeLabel = company ? company.name : "Todas as empresas";

  const headers = ["Tipo", "Categoria", "Valor", "Moeda"];
  const rows: unknown[][] = [
    ...pl.revenueByCategory.map((r) => ["Receita", r.category, r.amount.toFixed(2), pl.referenceCurrency]),
    ...pl.expenseByCategory.map((e) => ["Despesa", e.category, e.amount.toFixed(2), pl.referenceCurrency]),
    ["Total", "Receita total", pl.totalRevenue.toFixed(2), pl.referenceCurrency],
    ["Total", "Despesa total", pl.totalExpense.toFixed(2), pl.referenceCurrency],
    ["Total", "Resultado líquido", pl.grossProfit.toFixed(2), pl.referenceCurrency],
    ["Total", "Margem (%)", pl.margin.toFixed(2), ""],
  ];

  const filename = `dre_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}_${period}`;

  if (format === "xlsx") {
    const buffer = buildWorkbookBuffer([
      { name: "DRE", headers, rows },
      {
        name: "Tendência 6 meses",
        headers: ["Mês", "Receita", "Despesa", "Resultado"],
        rows: pl.monthlyTrend.map((t) => [t.month, t.revenue.toFixed(2), t.expense.toFixed(2), t.profit.toFixed(2)]),
      },
    ]);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const bytes = await buildDrePdf(pl, scopeLabel);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
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
