import type { SourceAdapter, IngestResult } from "./adapter";
import { allAdapters, officialAdapters, snsAdapter } from "./sources";
import { ingestRaws } from "./ingest";

// 自動取得オーケストレータ（Vercel Cron から起動）。
// 各アダプタが一次情報を取得 → ingestRaws（正規化・差分検出・ログ）→ 結果を返す。
async function runAdapter(adapter: SourceAdapter): Promise<IngestResult> {
  const ranAt = new Date().toISOString();
  const errors: string[] = [];
  let fetched = 0;
  let changed = 0;
  try {
    const raws = await adapter.fetch();
    fetched = raws.length;
    if (raws.length) {
      const outcome = await ingestRaws(raws, { source: adapter.sourceType, format: adapter.id });
      changed = outcome.diff.inserted + outcome.diff.updatedStatus;
      errors.push(...outcome.errors.slice(0, 10)); // ログ肥大を防ぐため先頭のみ
    }
  } catch (e) {
    errors.push(String(e));
  }
  return { source: adapter.id, fetched, changed, errors, ranAt };
}

export async function refresh(scope: "all" | "official" | "sns"): Promise<IngestResult[]> {
  const targets =
    scope === "official" ? officialAdapters : scope === "sns" ? [snsAdapter] : allAdapters;
  return Promise.all(targets.map(runAdapter));
}

export { ingest } from "./ingest";
