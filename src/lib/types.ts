// 供給状況の区分
export type SupplyStatus = "通常出荷" | "限定出荷" | "供給停止" | "販売中止";

// データの出所種別（原サイトでは全件"不明"だった部分をきちんと型で扱う）
export type SourceType =
  | "厚労省" // 厚労省 医療用医薬品供給状況報告
  | "日薬連" // 日本製薬団体連合会 供給状況調査
  | "PMDA" // 回収・添付文書改訂など
  | "メーカー" // 製造販売元の出荷調整告知
  | "SNS" // X等の現場情報（未確定）
  | "不明";

// 確度レイヤー。確定（公式裏取り済み）と速報（未確認）を明確に分離する。
export type ConfidenceLayer = "確定" | "速報";

// SNS等の現場情報。確定情報とはレイヤーを分けて保持する。
export type FieldIntelLabel =
  | "official_confirmed" // 公式と一致を確認済み
  | "official_reference_needed" // 要公式確認
  | "field_report" // 現場報告
  | "screenshot_observed"; // スクショ観測

export interface FieldIntel {
  label: FieldIntelLabel;
  target: string; // 対象薬剤
  summary: string; // 要約
  note?: string; // 注意書き
  postedBy?: string; // 投稿元（@handle 等）
  observedAt: string; // 観測日 YYYY-MM-DD
}

// 代替薬候補
export interface Alternative {
  yjCode?: string;
  name: string;
  note?: string; // 力価換算・保険適用など
  insuranceCovered?: boolean; // 保険適用の有無（不明なら undefined）
}

// 1医薬品（YJコードを主キーとする）の供給レコード
export interface DrugRecord {
  id: string;
  yjCode: string; // 個別医薬品コード（名寄せの主キー）
  originalDrug: string; // 一般名 or 主たる品名
  brandName?: string; // 先発品名
  ingredient?: string; // 一般名
  therapeuticClass?: string; // 薬効分類
  representativeSpec?: string; // 代表規格
  supplyStatus: SupplyStatus;
  // 出所と確認のトレーサビリティ（課金の信頼の核）
  sourceType: SourceType;
  sourceDetail: string; // 出典の説明文
  sourceUrl?: string; // 出典URL
  verifiedAt: string; // 最終確認日 YYYY-MM-DD
  confidence: ConfidenceLayer;
  shortageReason?: string; // 欠品理由
  recoveryOutlook?: string; // 解除/解消見込み
  warningTags: string[];
  clinicalNotes: string[];
  alternatives: Alternative[];
  fieldIntel: FieldIntel[]; // 速報レイヤー（補助）
}

// /api/drugs のレスポンス形
export interface DrugsApiResponse {
  rows: DrugRecord[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  latestVerifiedDate: string | null;
  error?: string;
}
