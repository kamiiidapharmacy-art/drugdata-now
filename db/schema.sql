-- 本番用 Postgres スキーマ（Render Postgres / Supabase / Neon / Vercel Postgres 等）。
-- DATABASE_URL（または POSTGRES_URL）を設定すると src/lib/storage/postgres.ts
-- （node-postgres）が自動でこのテーブルを使う。
-- 初回アクセス時に CREATE TABLE IF NOT EXISTS で自動作成もされるため、
-- このファイルは手動プロビジョニング・確認用。

CREATE TABLE IF NOT EXISTS drugs (
  yj_code    TEXT PRIMARY KEY,            -- 名寄せの主キー（YJコード）
  data       JSONB NOT NULL,             -- DrugRecord 全体を保持
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingest_log (
  id      BIGSERIAL PRIMARY KEY,
  entry   JSONB NOT NULL,                -- IngestLogEntry（受領件数・差分・エラー）
  ran_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 供給状況での絞り込みを高速化（任意）
CREATE INDEX IF NOT EXISTS idx_drugs_supply_status ON drugs ((data->>'supplyStatus'));
CREATE INDEX IF NOT EXISTS idx_ingest_log_ran_at ON ingest_log (ran_at DESC);
