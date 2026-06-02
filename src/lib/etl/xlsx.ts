import ExcelJS from "exceljs";
import type { RawDrugInput } from "../normalize";

// Excel(.xlsx) → RawDrugInput[]。
// 先頭シートの1行目をヘッダとし、DrugRecord のキー名に対応させる。
// 厚労省/日薬連のExcelは「CSV化せずそのまま」取り込めるようにする入口。
export async function parseXlsx(buffer: ArrayBuffer): Promise<RawDrugInput[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? "").trim();
  });

  const rows: RawDrugInput[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, string> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (!key) return;
      const v = cell.value;
      const text = v == null ? "" : typeof v === "object" && "text" in v ? String(v.text) : String(v);
      obj[key] = text.trim();
      if (obj[key]) hasValue = true;
    });
    if (hasValue) rows.push(obj as RawDrugInput);
  }
  return rows;
}
