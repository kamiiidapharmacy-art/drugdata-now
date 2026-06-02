import type { DrugRecord, SupplyStatus, SourceType, ConfidenceLayer, Alternative } from "./types";

const STATUSES: SupplyStatus[] = ["通常出荷", "限定出荷", "供給停止", "販売中止"];
const SOURCES: SourceType[] = ["厚労省", "日薬連", "PMDA", "メーカー", "SNS", "不明"];

// 取り込み時の生入力（CSV/JSONのゆるい形）
export interface RawDrugInput {
  yjCode?: string;
  originalDrug?: string;
  brandName?: string;
  ingredient?: string;
  therapeuticClass?: string;
  representativeSpec?: string;
  supplyStatus?: string;
  sourceType?: string;
  sourceDetail?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  confidence?: string;
  shortageReason?: string;
  recoveryOutlook?: string;
  warningTags?: string[] | string;
  clinicalNotes?: string[] | string;
  alternatives?: Alternative[] | string;
}

function splitList(v: string[] | string | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return v
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 代替薬: "名前|備考|保険(true/false)" を ; 区切り、または配列
function parseAlternatives(v: Alternative[] | string | undefined): Alternative[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, note, ins] = chunk.split("|").map((x) => x?.trim());
      const alt: Alternative = { name: name ?? chunk };
      if (note) alt.note = note;
      if (ins === "true") alt.insuranceCovered = true;
      if (ins === "false") alt.insuranceCovered = false;
      return alt;
    });
}

export class NormalizeError extends Error {}

// 生入力 → 検証済み DrugRecord。YJコードを主キーに id を導出する。
export function normalizeRecord(raw: RawDrugInput): DrugRecord {
  const yjCode = (raw.yjCode ?? "").trim();
  const originalDrug = (raw.originalDrug ?? "").trim();
  if (!yjCode) throw new NormalizeError("yjCode は必須です");
  if (!originalDrug) throw new NormalizeError(`originalDrug は必須です (YJ: ${yjCode})`);

  const supplyStatus = (raw.supplyStatus ?? "").trim() as SupplyStatus;
  if (!STATUSES.includes(supplyStatus))
    throw new NormalizeError(`supplyStatus が不正です: "${raw.supplyStatus}" (YJ: ${yjCode})`);

  let sourceType = (raw.sourceType ?? "不明").trim() as SourceType;
  if (!SOURCES.includes(sourceType)) sourceType = "不明";

  const verifiedAt = (raw.verifiedAt ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt))
    throw new NormalizeError(`verifiedAt は YYYY-MM-DD 形式が必須です (YJ: ${yjCode})`);

  // confidence 未指定なら出所から自動判定（SNSは速報、それ以外は確定）
  let confidence = (raw.confidence ?? "").trim() as ConfidenceLayer;
  if (confidence !== "確定" && confidence !== "速報") {
    confidence = sourceType === "SNS" ? "速報" : "確定";
  }

  return {
    id: `rec-${yjCode}`,
    yjCode,
    originalDrug,
    brandName: raw.brandName?.trim() || undefined,
    ingredient: raw.ingredient?.trim() || undefined,
    therapeuticClass: raw.therapeuticClass?.trim() || undefined,
    representativeSpec: raw.representativeSpec?.trim() || undefined,
    supplyStatus,
    sourceType,
    sourceDetail: raw.sourceDetail?.trim() || `${sourceType} 取り込みデータ`,
    sourceUrl: raw.sourceUrl?.trim() || undefined,
    verifiedAt,
    confidence,
    shortageReason: raw.shortageReason?.trim() || undefined,
    recoveryOutlook: raw.recoveryOutlook?.trim() || undefined,
    warningTags: splitList(raw.warningTags),
    clinicalNotes: splitList(raw.clinicalNotes),
    alternatives: parseAlternatives(raw.alternatives),
    fieldIntel: [],
  };
}
