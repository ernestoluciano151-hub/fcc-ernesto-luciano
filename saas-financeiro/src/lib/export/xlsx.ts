import * as XLSX from "xlsx";

// ============================================================================
// Exportação Excel (.xlsx) genérica, reutilizada por todos os relatórios.
// ============================================================================

export function buildWorkbookBuffer(sheets: { name: string; headers: string[]; rows: unknown[][] }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}
