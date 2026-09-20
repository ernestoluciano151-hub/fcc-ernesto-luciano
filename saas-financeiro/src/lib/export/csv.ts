// ============================================================================
// Exportação CSV genérica — zero dependências externas. Usado por todos os
// relatórios exportáveis (secção 15 do pedido: "Relatórios em PDF/Excel/CSV").
// ============================================================================

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(";")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(";"));
  }
  // BOM UTF-8 para o Excel reconhecer acentuação portuguesa corretamente.
  return "﻿" + lines.join("\r\n");
}
