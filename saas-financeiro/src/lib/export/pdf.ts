import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ProfitAndLoss } from "@/lib/finance/reports";
import { formatMoney } from "@/lib/finance/money";

// ============================================================================
// Exportação PDF da DRE — gerado com pdf-lib (sem dependências nativas/wasm,
// seguro para o ambiente serverless do Vercel).
// ============================================================================

const PERIOD_LABEL: Record<string, string> = {
  today: "Hoje", week: "Última semana", month: "Último mês", "3m": "Últimos 3 meses", "6m": "Últimos 6 meses", year: "Último ano",
};

export async function buildDrePdf(pl: ProfitAndLoss, scopeLabel: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595.28, 841.89]); // A4
  const margin = 48;
  let y = 841.89 - margin;
  const lineHeight = 16;

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = doc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    }
  }

  function text(str: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; x?: number } = {}) {
    ensureSpace(lineHeight);
    page.drawText(str, {
      x: opts.x ?? margin,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? fontBold : font,
      color: opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1),
    });
    y -= (opts.size ?? 10) + 6;
  }

  function row(label: string, value: string, opts: { bold?: boolean; color?: [number, number, number] } = {}) {
    ensureSpace(lineHeight);
    page.drawText(label, { x: margin, y, size: 10, font: opts.bold ? fontBold : font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: 420, y, size: 10, font: opts.bold ? fontBold : font, color: opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  }

  text("Demonstração de Resultados (DRE)", { size: 18, bold: true });
  text(`${scopeLabel} — ${PERIOD_LABEL[pl.period] ?? pl.period}`, { size: 11, color: [0.4, 0.4, 0.4] });
  text(`Gerado em ${new Date().toLocaleDateString("pt-PT")} — ${pl.from.toLocaleDateString("pt-PT")} a ${pl.to.toLocaleDateString("pt-PT")}`, { size: 9, color: [0.5, 0.5, 0.5] });
  y -= 8;

  text("Resumo", { size: 13, bold: true });
  row("Receita total", formatMoney(pl.totalRevenue, pl.referenceCurrency), { color: [0.02, 0.5, 0.32] });
  row("Despesa total", formatMoney(pl.totalExpense, pl.referenceCurrency), { color: [0.7, 0.1, 0.1] });
  row("Resultado líquido", formatMoney(pl.grossProfit, pl.referenceCurrency), { bold: true, color: pl.grossProfit.isNegative() ? [0.7, 0.1, 0.1] : [0.02, 0.5, 0.32] });
  row("Margem", `${pl.margin.toFixed(1)}%`, { bold: true });
  y -= 12;

  text("Receitas por categoria", { size: 13, bold: true });
  if (pl.revenueByCategory.length === 0) {
    text("Sem receitas no período.", { size: 9, color: [0.5, 0.5, 0.5] });
  }
  for (const r of pl.revenueByCategory) {
    row(r.category, formatMoney(r.amount, pl.referenceCurrency));
  }
  y -= 12;

  text("Despesas por categoria", { size: 13, bold: true });
  if (pl.expenseByCategory.length === 0) {
    text("Sem despesas no período.", { size: 9, color: [0.5, 0.5, 0.5] });
  }
  for (const e of pl.expenseByCategory) {
    row(e.category, formatMoney(e.amount, pl.referenceCurrency));
  }
  y -= 12;

  text("Tendência (últimos 6 meses)", { size: 13, bold: true });
  for (const t of pl.monthlyTrend) {
    row(t.month, `Receita ${formatMoney(t.revenue, pl.referenceCurrency)}  ·  Despesa ${formatMoney(t.expense, pl.referenceCurrency)}  ·  Resultado ${formatMoney(t.profit, pl.referenceCurrency)}`);
  }

  return doc.save();
}
