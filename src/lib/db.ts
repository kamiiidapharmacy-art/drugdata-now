import type { DrugRecord, SupplyStatus, SourceType } from "./types";
import { allDrugs } from "./store";
import { buildNormalSupplyIndex, enrichWithAutoAlternatives } from "./alternatives";

export interface QueryOptions {
  q?: string;
  yjCodes?: string[]; // 指定YJコードのみ（採用品ダッシュボード用の一括取得）
  statuses?: SupplyStatus[];
  sources?: SourceType[];
  confidenceOnly?: boolean; // 確定レイヤーのみ
  sort?: "intel_freshness" | "verified_desc" | "name_asc";
  offset?: number;
  limit?: number;
}

const STATUS_RANK: Record<SupplyStatus, number> = {
  供給停止: 0,
  販売中止: 1,
  限定出荷: 2,
  通常出荷: 3,
};

export async function queryDrugs(opts: QueryOptions = {}) {
  const { q, yjCodes, statuses, sources, confidenceOnly, sort = "intel_freshness", offset = 0, limit = 30 } = opts;

  const allRows = await allDrugs();
  let rows = allRows;

  if (yjCodes && yjCodes.length) {
    const set = new Set(yjCodes);
    rows = rows.filter((d) => set.has(d.yjCode));
  }
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter((d) =>
      [d.originalDrug, d.brandName, d.ingredient, d.yjCode, ...d.alternatives.map((a) => a.name)]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle)),
    );
  }
  if (statuses && statuses.length) rows = rows.filter((d) => statuses.includes(d.supplyStatus));
  if (sources && sources.length) rows = rows.filter((d) => sources.includes(d.sourceType));
  if (confidenceOnly) rows = rows.filter((d) => d.confidence === "確定");

  rows.sort((a, b) => {
    if (sort === "name_asc") return a.originalDrug.localeCompare(b.originalDrug, "ja");
    if (sort === "verified_desc") return b.verifiedAt.localeCompare(a.verifiedAt);
    const rank = STATUS_RANK[a.supplyStatus] - STATUS_RANK[b.supplyStatus];
    if (rank !== 0) return rank;
    const af = a.fieldIntel[0]?.observedAt ?? "";
    const bf = b.fieldIntel[0]?.observedAt ?? "";
    if (af !== bf) return bf.localeCompare(af);
    return b.verifiedAt.localeCompare(a.verifiedAt);
  });

  const total = rows.length;
  const altIndex = buildNormalSupplyIndex(allRows);
  const paged = rows
    .slice(offset, offset + limit)
    .map((d) => enrichWithAutoAlternatives(d, altIndex));
  const nextOffset = offset + limit < total ? offset + limit : null;
  const latestVerifiedDate =
    allRows
      .map((d) => d.verifiedAt)
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return { rows: paged, total, hasMore: nextOffset !== null, nextOffset, latestVerifiedDate };
}

export async function getDrugByYjCode(yjCode: string): Promise<DrugRecord | null> {
  const rows = await allDrugs();
  const target = rows.find((d) => d.yjCode === yjCode);
  if (!target) return null;
  return enrichWithAutoAlternatives(target, buildNormalSupplyIndex(rows));
}
