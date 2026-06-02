import type { RawDrugInput } from "../normalize";

// 軽量CSVパーサ（ダブルクォート・改行・カンマのエスケープに対応、依存なし）。
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

// CSV文字列 → RawDrugInput[]。1行目をヘッダとして DrugRecord のキーに対応させる。
export function parseCsv(text: string): RawDrugInput[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    header.forEach((key, idx) => {
      obj[key] = (cells[idx] ?? "").trim();
    });
    return obj as RawDrugInput;
  });
}

// JSON文字列 → RawDrugInput[]。配列、または {rows:[...]} を受け付ける。
export function parseJson(text: string): RawDrugInput[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data as RawDrugInput[];
  if (data && Array.isArray(data.rows)) return data.rows as RawDrugInput[];
  throw new Error("JSONは配列、または {rows:[...]} 形式である必要があります");
}

export function parseByContentType(text: string, hint: "csv" | "json"): RawDrugInput[] {
  return hint === "csv" ? parseCsv(text) : parseJson(text);
}
