# 欠品・代替薬 Copilot Pro

医薬品の欠品状況と代替薬を一覧・検索する薬剤師向けツール。
原サイト（参考データの一覧表示）に対し、**出典・確認日の明示／確定・速報レイヤー分離／採用品ウォッチ＋欠品アラート／公式データ取り込みパイプライン**を加えた完成版スケルトン。

> ⚠️ 初期データ（`src/lib/seed.ts`）は動作確認用のサンプルです。供給状況・日付は架空であり実態を保証しません。実データは取り込み機能（`/admin`）で置き換えます。

## 技術スタック
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 / PWA（manifest + Service Worker）
- Vercel ホスティング（Cron / Edge Cache 前提）

## セットアップ
```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm test         # ユニットテスト（normalize / parse / diff）
```

## 主な機能
- **一覧/検索/フィルタ/並び替え**（`/`）— 供給状況・確定情報のみ・ウォッチのみで絞り込み。
- **出典＋確認日をレコード単位で表示** — 厚労省/日薬連/PMDA/メーカー/SNS を色分け。確定/速報レイヤーを分離。
- **自動更新（手動運用ゼロ）** — 厚労省の供給状況Excelを毎日自動で取得・パース・差分検出（Vercel Cron）。約16,000品目に対応。
- **代替薬の自動提示** — 限定出荷/供給停止/販売中止の薬に対し、同一成分で「通常出荷」の品目を自動抽出（同規格を優先）。公式データに無い情報をアプリ側で生成（差別化の核）。
- **採用品ウォッチ＋欠品アラート** — ウォッチ中の薬が指定状況になると画面上部に警告。
- **薬剤詳細ページ**（`/drug/[yjコード]`）。
- **データ取り込み（手動・任意）**（`/admin`）— 公式CSV/JSON/Excel(.xlsx)を貼り付け／アップロードして更新。YJコードで名寄せ・差分検出。
- **データ状況・更新ログ**（`/status`）。
- **エクスポート**（CSV/JSON）、**PWAオフライン対応**、ダークモード。

## 自動更新フロー（手動運用ゼロ・実装の核）
**運用者の操作なしで毎日更新される**自動取得パイプライン（`src/lib/etl/mhlw.ts`）:
1. Vercel Cron が毎日 `/api/cron/refresh?source=official` を起動。
2. 厚労省の出典ページ（`MHLW_PAGE_URL`）のHTMLを取得し、最新の供給状況Excel（`/content/…/{YYMMDD}iyakuhinkyoukyu.xlsx`）のURLと確認日を自動特定。
3. Excelをダウンロード→パース（ヘッダ行2／約16,000行）。丸数字つき供給状況（`①通常出荷`等）を4区分に正規化し、`（自社の事情）`等の括弧は欠品理由へ。
4. YJコードで名寄せ・upsert、供給状況の変化を `/status` のログに記録。
5. 限定出荷/供給停止の薬に同一成分の通常出荷品があれば、代替候補を自動生成（読み出し時に算出＝常に最新）。
6. ウォッチ中の採用品が該当すれば一覧上部にアラート表示。

> ✅ ローカル検証済み: 実際の厚労省Excel（2026-06-01版）で 16,169 件パース・全件正規化成功、URL自動特定・代替自動抽出も動作確認済み。
> ⚠️ 本番（Vercel）でのCron定期実行は **デプロイ後に要確認**（スケジュール発火・`POSTGRES_URL` 永続化はデプロイ環境依存）。

### 手動取り込み（任意・補完用）
公式に未反映の情報やSNS速報を足したい場合は `/admin` から手動取り込みも可能:
1. CSV/JSON/Excel(.xlsx) を貼り付け or アップロードして出所を選び「取り込む」。
2. YJコードで名寄せ・upsert され、差分が `/status` のログに残る。

### CSVフォーマット
ヘッダ（`/admin` でテンプレDL可）:
```
yjCode,originalDrug,brandName,ingredient,therapeuticClass,representativeSpec,supplyStatus,sourceType,sourceDetail,sourceUrl,verifiedAt,confidence,shortageReason,recoveryOutlook,warningTags,clinicalNotes,alternatives
```
- `supplyStatus`: 通常出荷 / 限定出荷 / 供給停止 / 販売中止（必須）
- `verifiedAt`: YYYY-MM-DD（必須）, `yjCode`/`originalDrug` 必須
- `warningTags`/`clinicalNotes`: `;` 区切り
- `alternatives`: `名前|備考|true(保険)` を `;` 区切り

## 構成
```
src/
  app/
    page.tsx                     一覧
    drug/[yjCode]/page.tsx       詳細
    admin/page.tsx               取り込みUI
    status/page.tsx              データ状況・更新ログ
    api/drugs/route.ts           /api/drugs（検索・フィルタ・ページング）
    api/admin/ingest/route.ts    取り込み（CSV/JSON/Excel, ADMIN_TOKEN保護）
    api/status/route.ts          状況JSON
    api/cron/refresh/route.ts    Vercel Cron（厚労省を毎日自動取得, maxDuration=300）
    not-found.tsx                404ページ
  lib/
    types.ts / seed.ts
    store.ts                     永続化ファサード（POSTGRES_URLでDB/ファイルを自動切替）
    storage/ (types[adapter I/F+diff] / file[既定] / postgres[本番])
    db.ts                        クエリ（読み出し時に代替薬を自動付与）
    normalize.ts                 生入力→検証済みDrugRecord
    alternatives.ts              同成分・通常出荷の代替薬を自動抽出
    etl/ (parse / ingest / xlsx / mhlw[厚労省取得+パース] / sources / index / adapter)
  components/                    UI
db/schema.sql                    本番Postgresスキーマ
tests/                           ユニットテスト（node:test, 依存ゼロ・全28件）
```

## 自動取得アダプタの状況
`src/lib/etl/sources.ts` の各アダプタ `fetch()` が `RawDrugInput[]` を返し、共通の `ingestRaws`（正規化・差分・ログ）を通る。
- **厚労省（mhlw）**: ✅ 実装済み（`src/lib/etl/mhlw.ts`）。PDL1.0で出典明示のうえ商用再配布可（2026-06 時点 確認済）。
- **日薬連（nichiyakuren）／PMDA**: スタブ（`[]`を返す）。実装すれば自動でCronに乗る。
- **SNS**: スタブ。実装時は `confidence: 速報` レイヤーで保持。
各ソースの **商用利用・再配布可否は要確認**。

## 永続化（ローカル / 本番の切替）
`store.ts` は環境変数で保存先を自動で切り替える:
- **未設定（ローカル/開発）**: `data/*.json` にファイル保存（`src/lib/storage/file.ts`）。サーバレスFSは揮発性のため本番には使わない。
- **`DATABASE_URL` または `POSTGRES_URL` あり（本番）**: Postgres を使用（`src/lib/storage/postgres.ts`、node-postgres ベース）。Render Postgres / Supabase / Neon など標準的な Postgres に接続できる。テーブルは初回アクセス時に自動作成（`db/schema.sql` 参照）。16,000件は500行ずつのバルクINSERTで投入。

> ⚠️ Postgres アダプタは **実DB未接続のため未検証**。`DATABASE_URL` 設定後、`/api/cron/refresh?source=official` で取り込み→`/status` に16,000件反映されることを必ず確認してください。

## デプロイ（Render）手順 — 「Render完結」構成
DBもCronもRender内で完結させる構成（`render.yaml` 同梱）。
1. コードを GitHub に push（Gitの初期化・初回コミットは依頼可。pushはあなたのGitHubで）。
2. Render → **Blueprints** → このリポジトリを指定。`render.yaml` から **Webサービス＋Postgres＋日次Cron** がまとめて作成される。
   - `DATABASE_URL` は Postgres から Webサービスへ自動注入。
   - `ADMIN_TOKEN` / `CRON_SECRET` は env グループで自動生成・web/cron間で共有。
3. デプロイ後、`/status` を開く。Cron（毎日UTC0時=日本時間9時）で16,000件が自動取り込み。待てなければ Render の Cron Job を「Trigger Run」するか、`/api/cron/refresh?source=official`（`Authorization: Bearer <CRON_SECRET>`）を叩く。

> ⚠️ Render側の注意（要確認）:
> - **free Web サービスは無操作でスリープ**（次アクセスでコールドスタート〜数十秒）。
> - **free Postgres は作成から約90日で削除**される。継続運用は有料DBか Supabase/Neon を検討。
> - **Render Cron Job は無料プランに無い可能性**。その場合は `render.yaml` の cron サービスを消し、**外部の無料cron（例: cron-job.org）**で公開URL `https://<your>.onrender.com/api/cron/refresh?source=official` を1日1回・`Authorization: Bearer <CRON_SECRET>` ヘッダ付きで叩く（追加費用ほぼ0）。

### 別案: Vercel にする場合
`vercel.json`（公式 毎日9時の1日1回 / Hobby無料枠でそのまま可）でデプロイ。DBは Vercel Postgres か Neon。
※その場合、Postgresアダプタは node-postgres 接続のため、Vercel Postgres でも接続文字列を `DATABASE_URL`/`POSTGRES_URL` に入れれば動く想定（要確認）。

---

## あなた（運用者）にお願いしたいこと
**目標は「あなたの手を介さず回るシステム」**。厚労省データの自動取得は実装済みなので、残るのは一度きりのデプロイ作業だけ:
1. **GitHubへ push**（Git初期化・コミットは依頼可。push はあなたのGitHubアカウントで）。
2. **Render で Blueprint デプロイ**（上記手順2）。DB・Cronは `render.yaml` が自動構成。
3. **Cron方式の確認**: Render Cron が有料なら、外部無料cron（cron-job.org等）で公開URLを1日1回叩く設定にする（手順案内可）。
4. **再配布可否の最終確認**（公開運用する場合）: 厚労省データはPDL1.0で出典明示のうえ商用再配布可（コードで出典URL・確認日を自動付与済み）。日薬連/PMDA等の他ソースを足す場合は各規約を確認。
4. （任意）**手動補完**: 公式に未反映の速報を足したいときだけ `/admin` から取り込み。通常は不要。
