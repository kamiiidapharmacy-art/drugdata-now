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

-- 求人掲載（薬局セルフ掲載 / Indeed型MVP）
CREATE TABLE IF NOT EXISTS job_postings (
  id         TEXT PRIMARY KEY,            -- 公開ID（編集用トークンは data 内に保持）
  data       JSONB NOT NULL,             -- JobPosting 全体を保持
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending / published / closed
  featured   BOOLEAN NOT NULL DEFAULT false,   -- 上位表示（課金枠・将来）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 供給状況での絞り込みを高速化（任意）
CREATE INDEX IF NOT EXISTS idx_drugs_supply_status ON drugs ((data->>'supplyStatus'));
CREATE INDEX IF NOT EXISTS idx_ingest_log_ran_at ON ingest_log (ran_at DESC);
-- 公開一覧の並び（featured優先→新着順）と状態フィルタを高速化
CREATE INDEX IF NOT EXISTS idx_job_postings_list ON job_postings (status, featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_prefecture ON job_postings ((data->>'prefecture'));
