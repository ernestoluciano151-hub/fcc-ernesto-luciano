import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCSV } from "@/lib/export/csv";
import { buildWorkbookBuffer } from "@/lib/export/xlsx";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const expenses = await prisma.expense.findMany({
    orderBy: { occurredAt: "desc" },
    include: { company: true, responsible: true },
  });

  const headers = ["Data", "Empresa", "Categoria", "Descrição", "Valor", "Moeda", "Responsável", "Método de pagamento"];
  const rows = expenses.map((e) => [
    e.occurredAt.toLocaleDateString("pt-PT"),
    e.company.name,
    e.category,
    e.description,
    e.amount.toFixed(2),
    e.currency,
    e.responsible.name,
    e.paymentMethod ?? "",
  ]);

  if (format === "xlsx") {
    const buffer = buildWorkbookBuffer([{ name: "Despesas", headers, rows }]);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="despesas.xlsx"`,
      },
    });
  }

  const csv = toCSV(headers, rows);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="despesas.csv"` },
  });
}
