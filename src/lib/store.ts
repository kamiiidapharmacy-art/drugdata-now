import type { DrugRecord, JobPosting } from "./types";
import { FileStorage } from "./storage/file";
import { PostgresStorage } from "./storage/postgres";
import type { StorageAdapter, UpsertDiff, IngestLogEntry } from "./storage/types";

export type { UpsertDiff, IngestLogEntry } from "./storage/types";

// POSTGRES_URL（または DATABASE_URL）があれば本番DB、なければローカルのファイル保存を使う。
let adapter: StorageAdapter | null = null;
function getAdapter(): StorageAdapter {
  if (!adapter) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    adapter = url ? new PostgresStorage() : new FileStorage();
  }
  return adapter;
}

export function allDrugs(): Promise<DrugRecord[]> {
  return getAdapter().all();
}

export function upsertDrugs(records: DrugRecord[]): Promise<UpsertDiff> {
  return getAdapter().upsert(records);
}

export function appendIngestLog(entry: IngestLogEntry): Promise<void> {
  return getAdapter().appendLog(entry);
}

export function readIngestLog(): Promise<IngestLogEntry[]> {
  return getAdapter().readLog();
}

// ===== 求人掲載 =====
export function allJobs(): Promise<JobPosting[]> {
  return getAdapter().allJobs();
}

export function saveJob(job: JobPosting): Promise<void> {
  return getAdapter().saveJob(job);
}

export function deleteJob(id: string): Promise<void> {
  return getAdapter().deleteJob(id);
}
