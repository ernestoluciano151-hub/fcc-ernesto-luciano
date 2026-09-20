import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCSV } from "@/lib/export/csv";
import { buildWorkbookBuffer } from "@/lib/export/xlsx";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const revenues = await prisma.revenue.findMany({
    orderBy: { occurredAt: "desc" },
    include: { company: true },
  });

  const headers = ["Data", "Empresa", "Categoria", "Descrição", "Valor", "Moeda"];
  const rows = revenues.map((r) => [
    r.occurredAt.toLocaleDateString("pt-PT"),
    r.company.name,
    r.category,
    r.description,
    r.amount.toFixed(2),
    r.currency,
  ]);

  if (format === "xlsx") {
    const buffer = buildWorkbookBuffer([{ name: "Receitas", headers, rows }]);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="receitas.xlsx"`,
      },
    });
  }

  const csv = toCSV(headers, rows);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="receitas.csv"` },
  });
}
