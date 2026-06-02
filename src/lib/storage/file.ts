import fs from "node:fs";
import path from "node:path";
import type { DrugRecord, JobPosting } from "../types";
import { SEED_DRUGS } from "../seed";
import { computeDiff, type StorageAdapter, type UpsertDiff, type IngestLogEntry } from "./types";

// ファイル保存アダプタ（ローカル / 単一インスタンス用）。
// VercelのサーバレスFSは揮発性のため、本番は PostgresStorage を使うこと。
export class FileStorage implements StorageAdapter {
  private dataDir = path.join(process.cwd(), "data");
  private drugsFile = path.join(this.dataDir, "drugs.json");
  private logFile = path.join(this.dataDir, "ingest-log.json");
  private jobsFile = path.join(this.dataDir, "jobs.json");
  private cache: Map<string, DrugRecord> | null = null;
  private jobsCache: JobPosting[] | null = null;

  private ensureDir() {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch {}
  }

  // Map のキーは YJコード（名寄せの主キー）。id はReactキー等の表示用。
  private load(): Map<string, DrugRecord> {
    if (this.cache) return this.cache;
    const map = new Map<string, DrugRecord>();
    try {
      if (fs.existsSync(this.drugsFile)) {
        const raw = JSON.parse(fs.readFileSync(this.drugsFile, "utf8")) as DrugRecord[];
        for (const d of raw) map.set(d.yjCode, d);
      }
    } catch {
      // ファイル破損時はシードにフォールバック
    }
    if (map.size === 0) {
      for (const d of SEED_DRUGS) map.set(d.yjCode, d);
    }
    this.cache = map;
    return map;
  }

  private persist(map: Map<string, DrugRecord>) {
    this.ensureDir();
    try {
      fs.writeFileSync(this.drugsFile, JSON.stringify([...map.values()], null, 2), "utf8");
    } catch {
      // 書き込み不可環境（Vercel本番等）では握りつぶす。本番はDBを使うこと。
    }
  }

  async all(): Promise<DrugRecord[]> {
    return [...this.load().values()];
  }

  async upsert(records: DrugRecord[]): Promise<UpsertDiff> {
    const map = this.load();
    const prev = new Map<string, string>();
    for (const r of records) {
      const e = map.get(r.yjCode);
      if (e) prev.set(r.yjCode, e.supplyStatus);
    }
    const diff = computeDiff(prev, records);
    for (const r of records) map.set(r.yjCode, r);
    this.persist(map);
    return diff;
  }

  async appendLog(entry: IngestLogEntry): Promise<void> {
    this.ensureDir();
    let log: IngestLogEntry[] = [];
    try {
      if (fs.existsSync(this.logFile)) log = JSON.parse(fs.readFileSync(this.logFile, "utf8"));
    } catch {}
    log.unshift(entry);
    log = log.slice(0, 50);
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(log, null, 2), "utf8");
    } catch {}
  }

  async readLog(): Promise<IngestLogEntry[]> {
    try {
      if (fs.existsSync(this.logFile)) return JSON.parse(fs.readFileSync(this.logFile, "utf8"));
    } catch {}
    return [];
  }

  // ===== 求人 =====
  private loadJobs(): JobPosting[] {
    if (this.jobsCache) return this.jobsCache;
    let jobs: JobPosting[] = [];
    try {
      if (fs.existsSync(this.jobsFile)) jobs = JSON.parse(fs.readFileSync(this.jobsFile, "utf8"));
    } catch {
      jobs = [];
    }
    this.jobsCache = jobs;
    return jobs;
  }

  private persistJobs(jobs: JobPosting[]) {
    this.ensureDir();
    this.jobsCache = jobs;
    try {
      fs.writeFileSync(this.jobsFile, JSON.stringify(jobs, null, 2), "utf8");
    } catch {}
  }

  async allJobs(): Promise<JobPosting[]> {
    return [...this.loadJobs()];
  }

  async saveJob(job: JobPosting): Promise<void> {
    const jobs = this.loadJobs();
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) jobs[idx] = job;
    else jobs.push(job);
    this.persistJobs(jobs);
  }

  async deleteJob(id: string): Promise<void> {
    const jobs = this.loadJobs().filter((j) => j.id !== id);
    this.persistJobs(jobs);
  }
}
