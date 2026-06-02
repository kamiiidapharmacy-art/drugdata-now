import type { DrugRecord, Alternative } from "./types";

// 欠品系（限定出荷/供給停止/販売中止）の薬に対し、
// 同一成分で「通常出荷」の薬を自動抽出して代替候補として提示する。
// 公式データには代替薬が含まれないため、これがアプリ独自の価値（差別化）。
// ※あくまで同成分の機械抽出。最終判断（力価・適応・剤形）は薬剤師が行う前提で note を付す。

const NEEDS_ALT = new Set<DrugRecord["supplyStatus"]>(["限定出荷", "供給停止", "販売中止"]);

function normKey(s?: string): string {
  return (s ?? "").replace(/\s+/g, "").toLowerCase();
}

// 全件から「成分名 → 通常出荷の薬」のインデックスを構築する。
export function buildNormalSupplyIndex(all: DrugRecord[]): Map<string, DrugRecord[]> {
  const map = new Map<string, DrugRecord[]>();
  for (const d of all) {
    if (d.supplyStatus !== "通常出荷") continue;
    const key = normKey(d.ingredient);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(d);
    else map.set(key, [d]);
  }
  return map;
}

// 対象薬に対する自動代替候補。同成分・通常出荷を、同規格を優先して最大 max 件返す。
export function autoAlternativesFor(
  target: DrugRecord,
  index: Map<string, DrugRecord[]>,
  max = 5,
): Alternative[] {
  if (!NEEDS_ALT.has(target.supplyStatus)) return [];
  const key = normKey(target.ingredient);
  if (!key) return [];

  const targetSpec = normKey(target.representativeSpec);
  const candidates = (index.get(key) ?? [])
    .filter((d) => d.yjCode !== target.yjCode)
    .sort((a, b) => {
      // 同規格を優先
      const as = normKey(a.representativeSpec) === targetSpec ? 0 : 1;
      const bs = normKey(b.representativeSpec) === targetSpec ? 0 : 1;
      if (as !== bs) return as - bs;
      return a.originalDrug.localeCompare(b.originalDrug, "ja");
    });

  return candidates.slice(0, max).map((d) => {
    const sameSpec = normKey(d.representativeSpec) === targetSpec;
    return {
      yjCode: d.yjCode,
      name: d.originalDrug,
      equivalence: (sameSpec ? "same_spec" : "diff_spec") as "same_spec" | "diff_spec",
      note: sameSpec
        ? "同成分・同規格の通常出荷品（自動抽出・要確認）"
        : "同成分の通常出荷品（規格差あり・自動抽出・要確認）",
    };
  });
}

// 手動の代替薬（CSV取り込み等）に自動候補をマージする。重複は yjCode/name で排除。
export function enrichWithAutoAlternatives(
  target: DrugRecord,
  index: Map<string, DrugRecord[]>,
): DrugRecord {
  const auto = autoAlternativesFor(target, index);
  if (!auto.length) return target;

  const seen = new Set(target.alternatives.map((a) => a.yjCode ?? a.name));
  const merged = [...target.alternatives];
  for (const a of auto) {
    const k = a.yjCode ?? a.name;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(a);
  }
  return { ...target, alternatives: merged };
}
