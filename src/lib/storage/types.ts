import type { DrugRecord, JobPosting } from "../types";

export interface UpsertDiff {
  inserted: number;
  updatedStatus: number;
  unchanged: number;
  changes: { yjCode: string; name: string; from: string | null; to: string }[];
}

export interface IngestLogEntry {
  ranAt: string;
  source: string;
  format: string;
  received: number;
  diff: UpsertDiff;
  errors: string[];
}

// 永続化レイヤーの抽象。ローカル/単一インスタンスは FileStorage、
// 本番（Vercel等）は POSTGRES_URL を設定して PostgresStorage に切り替える。
export interface StorageAdapter {
  all(): Promise<DrugRecord[]>;
  upsert(records: DrugRecord[]): Promise<UpsertDiff>;
  appendLog(entry: IngestLogEntry): Promise<void>;
  readLog(): Promise<IngestLogEntry[]>;
  // 求人掲載
  allJobs(): Promise<JobPosting[]>;
  saveJob(job: JobPosting): Promise<void>; // id で upsert
  deleteJob(id: string): Promise<void>;
}

// YJコード単位の upsert 差分を計算する共通ロジック（アダプタ間で挙動を揃える）。
export function computeDiff(
  prevStatusByYj: Map<string, string>,
  records: DrugRecord[],
): UpsertDiff {
  const diff: UpsertDiff = { inserted: 0, updatedStatus: 0, unchanged: 0, changes: [] };
  for (const r of records) {
    const prev = prevStatusByYj.get(r.yjCode);
    if (prev === undefined) {
      diff.inserted++;
      diff.changes.push({ yjCode: r.yjCode, name: r.originalDrug, from: null, to: r.supplyStatus });
    } else if (prev !== r.supplyStatus) {
      diff.updatedStatus++;
      diff.changes.push({ yjCode: r.yjCode, name: r.originalDrug, from: prev, to: r.supplyStatus });
    } else {
      diff.unchanged++;
    }
  }
  return diff;
}
