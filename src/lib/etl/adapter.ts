import type { RawDrugInput } from "../normalize";
import type { SourceType } from "../types";

// 各データソースは共通インターフェースを実装する。
// fetch: 一次情報（Excel/PDF/HTML/API）を取得し RawDrugInput[] に整形して返す。
// 正規化（検証・確度付与・差分検出・ログ）は共通の ingestRaws が担う。
// 正規化のキーは YJコード。
export interface SourceAdapter {
  readonly id: string;
  readonly label: string;
  readonly sourceType: SourceType; // 取り込み時に付与する出所種別
  readonly cadence: "hourly" | "daily" | "weekly" | "monthly";
  fetch(): Promise<RawDrugInput[]>;
}

// 取り込み結果のサマリ（cron/監査ログ用）
export interface IngestResult {
  source: string;
  fetched: number;
  changed: number;
  errors: string[];
  ranAt: string;
}
