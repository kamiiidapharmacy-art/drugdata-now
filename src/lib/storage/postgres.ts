import { Pool } from "pg";
import type { DrugRecord } from "../types";
import { computeDiff, type StorageAdapter, type UpsertDiff, type IngestLogEntry } from "./types";

// Postgres アダプタ（本番想定 / node-postgres ベース）。
// POSTGRES_URL または DATABASE_URL が設定されているとき store.ts から選択される。
// Render Postgres / Supabase / Neon など、標準的な接続文字列の Postgres で動く。
// DrugRecord をそのまま jsonb として保存し、yj_code を主キーに名寄せする。

const CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// 接続文字列から SSL 設定を推定する。
// - localhost / sslmode=disable → SSL なし
// - それ以外（Render外部URL等）→ SSL 有効（自己署名を許容）
function sslOption(conn: string): false | { rejectUnauthorized: boolean } {
  if (/sslmode=disable/.test(conn) || /@(localhost|127\.0\.0\.1)/.test(conn)) return false;
  return { rejectUnauthorized: false };
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: CONN, ssl: sslOption(CONN), max: 5 });
  }
  return pool;
}

const UPSERT_CHUNK = 500; // 1文あたりの行数（16,000件を分割投入）

export class PostgresStorage implements StorageAdapter {
  private schemaReady: Promise<void> | null = null;

  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        const p = getPool();
        await p.query(`CREATE TABLE IF NOT EXISTS drugs (
          yj_code TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
        await p.query(`CREATE TABLE IF NOT EXISTS ingest_log (
          id BIGSERIAL PRIMARY KEY,
          entry JSONB NOT NULL,
          ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      })();
    }
    return this.schemaReady;
  }

  async all(): Promise<DrugRecord[]> {
    await this.ensureSchema();
    const { rows } = await getPool().query<{ data: DrugRecord }>("SELECT data FROM drugs");
    return rows.map((r) => r.data);
  }

  async upsert(records: DrugRecord[]): Promise<UpsertDiff> {
    await this.ensureSchema();
    if (records.length === 0) return { inserted: 0, updatedStatus: 0, unchanged: 0, changes: [] };

    const p = getPool();

    // 既存の供給状況を取得して差分判定の材料にする。
    const yjCodes = records.map((r) => r.yjCode);
    const { rows: existing } = await p.query<{ yj_code: string; status: string }>(
      "SELECT yj_code, data->>'supplyStatus' AS status FROM drugs WHERE yj_code = ANY($1::text[])",
      [yjCodes],
    );
    const prev = new Map<string, string>();
    for (const e of existing) prev.set(e.yj_code, e.status);

    const diff = computeDiff(prev, records);

    // バルク upsert（500行ずつ multi-row INSERT）。
    for (let i = 0; i < records.length; i += UPSERT_CHUNK) {
      const chunk = records.slice(i, i + UPSERT_CHUNK);
      const values: string[] = [];
      const params: unknown[] = [];
      chunk.forEach((r, idx) => {
        const base = idx * 2;
        values.push(`($${base + 1}, $${base + 2}::jsonb)`);
        params.push(r.yjCode, JSON.stringify(r));
      });
      await p.query(
        `INSERT INTO drugs (yj_code, data) VALUES ${values.join(", ")}
         ON CONFLICT (yj_code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        params,
      );
    }

    return diff;
  }

  async appendLog(entry: IngestLogEntry): Promise<void> {
    await this.ensureSchema();
    await getPool().query("INSERT INTO ingest_log (entry, ran_at) VALUES ($1::jsonb, $2)", [
      JSON.stringify(entry),
      entry.ranAt,
    ]);
  }

  async readLog(): Promise<IngestLogEntry[]> {
    await this.ensureSchema();
    const { rows } = await getPool().query<{ entry: IngestLogEntry }>(
      "SELECT entry FROM ingest_log ORDER BY ran_at DESC LIMIT 50",
    );
    return rows.map((r) => r.entry);
  }
}
