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

// 自動抽出した代替候補の「同等性」シグナル（疑義照会要否の参考判定に使う）
//  same_spec  : 同一成分・同一代表規格（変更調剤の範囲内の可能性）
//  diff_spec  : 同一成分だが規格差あり（力価・剤形差→疑義照会が必要な可能性）
//  undefined  : 手動登録など、自動判定の対象外
export type Equivalence = "same_spec" | "diff_spec";

// 代替薬候補
export interface Alternative {
  yjCode?: string;
  name: string;
  note?: string; // 力価換算・保険適用など
  insuranceCovered?: boolean; // 保険適用の有無（不明なら undefined）
  equivalence?: Equivalence; // 自動抽出時の同等性（疑義照会要否の参考判定用）
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

// ===== 求人掲載（薬局セルフ掲載 / Indeed型のMVP）=====

export type EmploymentType = "正社員" | "パート・アルバイト" | "契約社員" | "派遣" | "その他";
export type JobCategory = "薬剤師" | "登録販売者" | "調剤事務" | "医療事務" | "その他";
// pending=未承認(審査待ち) / published=公開中 / closed=募集終了
export type JobStatus = "pending" | "published" | "closed";

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "正社員",
  "パート・アルバイト",
  "契約社員",
  "派遣",
  "その他",
];
export const JOB_CATEGORIES: JobCategory[] = [
  "薬剤師",
  "登録販売者",
  "調剤事務",
  "医療事務",
  "その他",
];

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;
export type Prefecture = (typeof PREFECTURES)[number];

// 1件の求人。応募者の個人情報は持たず、応募は外部リンク/連絡先で受ける（PII回避）。
export interface JobPosting {
  id: string;
  pharmacyName: string; // 薬局名（必須）
  prefecture: string; // 都道府県（必須）
  city?: string; // 市区町村
  title: string; // 見出し（必須）例: 「薬剤師（正社員）募集」
  jobCategory: JobCategory;
  employmentType: EmploymentType;
  salary?: string; // 給与（フリーテキスト）
  description: string; // 仕事内容（必須）
  applyUrl?: string; // 応募先URL（外部）
  applyContact?: string; // 応募先（メール/電話）— URLが無い場合
  status: JobStatus;
  featured: boolean; // 上位表示（課金枠・将来）
  createdAt: string; // ISO
  updatedAt: string; // ISO
  editToken: string; // 投稿者の編集・削除用（公開APIでは返さない）
}

// 公開用（編集トークンを除いた形）。一覧・詳細のレスポンスはこれ。
export type PublicJob = Omit<JobPosting, "editToken">;

// /api/jobs のレスポンス形
export interface JobsApiResponse {
  rows: PublicJob[];
  total: number;
  error?: string;
}
