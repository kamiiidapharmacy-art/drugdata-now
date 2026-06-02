import ExcelJS from "exceljs";
import type { RawDrugInput } from "../normalize";

// 厚労省「医療用医薬品の供給状況」Excel の自動取得＋パース。
// 規約: 公共データ利用規約(PDL1.0) — 出典明示で商用再配布可（2026-06 時点）。
// 出典ページ（毎月更新。最新の .xlsx へのリンクを掲載）:
export const MHLW_PAGE_URL =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/kouhatu-iyaku/04_00003.html";

const MHLW_ORIGIN = "https://www.mhlw.go.jp";

// 供給状況Excelの URL パターン: /content/10800000/260601iyakuhinkyoukyu.xlsx
const XLSX_PATH_RE = /\/content\/\d+\/(\d{6})iyakuhinkyoukyu\.xlsx/g;

// 260601 → 2026-06-01（YYMMDD、20xx 固定）
export function mhlwDateToIso(yymmdd: string): string {
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  return `20${yy}-${mm}-${dd}`;
}

// 出典ページ HTML から最新の供給状況Excel URL と確認日(verifiedAt)を特定する。
export async function fetchLatestMhlwXlsx(): Promise<{ url: string; verifiedAt: string }> {
  const res = await fetch(MHLW_PAGE_URL, { headers: { "User-Agent": "drugdata-now/1.0" } });
  if (!res.ok) throw new Error(`MHLW ページ取得失敗: HTTP ${res.status}`);
  const html = await res.text();

  let best: { path: string; date: string } | null = null;
  for (const m of html.matchAll(XLSX_PATH_RE)) {
    const path = m[0];
    const date = m[1];
    if (!best || date > best.date) best = { path, date };
  }
  if (!best) throw new Error("MHLW ページに供給状況Excelのリンクが見つかりません");

  return { url: `${MHLW_ORIGIN}${best.path}`, verifiedAt: mhlwDateToIso(best.date) };
}

// "①通常出荷" / "②限定出荷（自社の事情）" / "⑤供給停止" などを
// 正規の SupplyStatus 文字列にし、括弧内の事由を理由として切り出す。
export function normalizeMhlwSupplyStatus(raw: string): { status: string; reason?: string } {
  // 先頭の丸数字（①〜⑳）と空白を除去
  const cleaned = raw.replace(/^[①-⑳\s]+/, "").trim();
  // 括弧内（理由）を分離
  const paren = cleaned.match(/[（(]([^）)]*)[）)]/);
  const reason = paren ? paren[1].trim() : undefined;
  const base = cleaned.replace(/[（(][^）)]*[）)]/g, "").trim();

  let status = "";
  if (base.includes("通常出荷")) status = "通常出荷";
  else if (base.includes("限定出荷")) status = "限定出荷";
  else if (base.includes("供給停止")) status = "供給停止";
  else if (base.includes("販売中止")) status = "販売中止";

  return { status, reason };
}

// ヘッダ（行2）の各セルから丸数字プレフィックスを除いた素のラベルを得る。
function bareHeader(text: string): string {
  return text.replace(/^[①-⑳\s]+/, "").trim();
}

// ヘッダラベル → RawDrugInput のフィールドへの対応を、行2を走査して列番号で確定する。
function buildColumnMap(headerRow: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    const label = bareHeader(String(cell.value ?? ""));
    if (!label) return;
    // 「品名」は「成分名」と区別する（成分名は "成分名"、品名は "品名"）
    if (label.includes("薬効分類") && map.therapeuticClass == null) map.therapeuticClass = col;
    else if (label.includes("成分名") && map.ingredient == null) map.ingredient = col;
    else if (label.includes("規格") && map.representativeSpec == null) map.representativeSpec = col;
    else if ((label.includes("YJ") || label.includes("ＹＪ")) && map.yjCode == null) map.yjCode = col;
    else if (label.includes("品名") && map.originalDrug == null) map.originalDrug = col;
    else if (label.includes("製造販売") && map.sourceDetail == null) map.sourceDetail = col;
    else if (label.includes("出荷") && label.includes("状況") && map.supplyStatus == null)
      map.supplyStatus = col;
    else if (label.includes("理由") && map.shortageReason == null) map.shortageReason = col;
  });
  return map;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text).trim();
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result).trim();
  return String(v).trim();
}

// 厚労省Excel(.xlsx) → RawDrugInput[]。ヘッダは行2、データは行3以降。
export async function parseMhlwBuffer(
  buffer: ArrayBuffer,
  verifiedAt: string,
): Promise<RawDrugInput[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws =
    wb.worksheets.find((s) => s.name.includes("供給状況")) ?? wb.worksheets[0];
  if (!ws) return [];

  const cols = buildColumnMap(ws.getRow(2));
  if (cols.yjCode == null || cols.supplyStatus == null) {
    throw new Error(
      `MHLW Excel のヘッダ解析に失敗（YJ列=${cols.yjCode} 状況列=${cols.supplyStatus}）`,
    );
  }

  const rows: RawDrugInput[] = [];
  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const yjCode = cols.yjCode ? cellText(row.getCell(cols.yjCode)) : "";
    const originalDrug = cols.originalDrug ? cellText(row.getCell(cols.originalDrug)) : "";
    if (!yjCode || !originalDrug) continue;

    const rawStatus = cols.supplyStatus ? cellText(row.getCell(cols.supplyStatus)) : "";
    const { status, reason } = normalizeMhlwSupplyStatus(rawStatus);
    if (!status) continue; // 4区分に当てはまらない行はスキップ

    // 理由列（"７．－" 等の「無し」表現は捨てる）
    let shortageReason = cols.shortageReason ? cellText(row.getCell(cols.shortageReason)) : "";
    shortageReason = shortageReason.replace(/^[\d０-９][．.\s]*/, "").trim();
    if (shortageReason === "－" || shortageReason === "-" || shortageReason === "") {
      shortageReason = reason ?? "";
    }

    rows.push({
      yjCode,
      originalDrug,
      ingredient: cols.ingredient ? cellText(row.getCell(cols.ingredient)) : undefined,
      therapeuticClass: cols.therapeuticClass
        ? cellText(row.getCell(cols.therapeuticClass))
        : undefined,
      representativeSpec: cols.representativeSpec
        ? cellText(row.getCell(cols.representativeSpec))
        : undefined,
      supplyStatus: status,
      sourceType: "厚労省",
      sourceDetail: cols.sourceDetail ? cellText(row.getCell(cols.sourceDetail)) : undefined,
      sourceUrl: MHLW_PAGE_URL,
      verifiedAt,
      shortageReason: shortageReason || undefined,
    });
  }
  return rows;
}

// アダプタから使う高レベル関数: 最新Excelを取得→パースして RawDrugInput[] を返す。
export async function fetchMhlwRaws(): Promise<RawDrugInput[]> {
  const { url, verifiedAt } = await fetchLatestMhlwXlsx();
  const res = await fetch(url, { headers: { "User-Agent": "drugdata-now/1.0" } });
  if (!res.ok) throw new Error(`MHLW Excel取得失敗: HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  return parseMhlwBuffer(buffer, verifiedAt);
}
