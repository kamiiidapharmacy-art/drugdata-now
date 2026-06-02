import { randomUUID } from "node:crypto";
import type { EmploymentType, JobCategory, JobPosting, PublicJob } from "./types";

// 検証用の許容値。型は types.ts を単一の真実とし、ここは実行時チェック用の写し。
// （types.ts は実行時インポートを持たず、テストランナーが軽量に読めるよう
//  店舗永続化〈store〉は各関数内で動的 import する。）
const VALID_EMPLOYMENT_TYPES: EmploymentType[] = ["正社員", "パート・アルバイト", "契約社員", "派遣", "その他"];
const VALID_JOB_CATEGORIES: JobCategory[] = ["薬剤師", "登録販売者", "調剤事務", "医療事務", "その他"];
// 47都道府県（types.ts の PREFECTURES と一致させること）
const VALID_PREFECTURES: string[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

// 求人掲載のドメインロジック。
// - 投稿はまず status="pending"（審査待ち）で受け、管理者が published に変える。
// - 応募者の個人情報は持たない（応募は外部URL/連絡先へ誘導）。
// - editToken は投稿者本人の編集・削除用。公開レスポンスには含めない。

// 投稿フォームから受け取る生入力（信頼しない）。
export interface RawJobInput {
  pharmacyName?: unknown;
  prefecture?: unknown;
  city?: unknown;
  title?: unknown;
  jobCategory?: unknown;
  employmentType?: unknown;
  salary?: unknown;
  description?: unknown;
  applyUrl?: unknown;
  applyContact?: unknown;
}

// 検証エラー（フィールド単位のメッセージを保持）。
export class JobValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("入力内容に不備があります");
    this.name = "JobValidationError";
    this.fields = fields;
  }
}

// 検証済みの正規化された入力（id/token/日時は未付与）。
interface CleanJobInput {
  pharmacyName: string;
  prefecture: string;
  city?: string;
  title: string;
  jobCategory: JobCategory;
  employmentType: EmploymentType;
  salary?: string;
  description: string;
  applyUrl?: string;
  applyContact?: string;
}

const MAX = {
  pharmacyName: 100,
  city: 50,
  title: 120,
  salary: 100,
  description: 4000,
  applyUrl: 500,
  applyContact: 200,
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// 生入力を検証して正規化する。NGなら JobValidationError を投げる。
export function validateJobInput(raw: RawJobInput): CleanJobInput {
  const fields: Record<string, string> = {};

  const pharmacyName = str(raw.pharmacyName);
  if (!pharmacyName) fields.pharmacyName = "薬局名は必須です";
  else if (pharmacyName.length > MAX.pharmacyName) fields.pharmacyName = `薬局名は${MAX.pharmacyName}文字以内で入力してください`;

  const prefecture = str(raw.prefecture);
  if (!prefecture) fields.prefecture = "都道府県は必須です";
  else if (!VALID_PREFECTURES.includes(prefecture)) fields.prefecture = "都道府県の指定が不正です";

  const city = str(raw.city);
  if (city && city.length > MAX.city) fields.city = `市区町村は${MAX.city}文字以内で入力してください`;

  const title = str(raw.title);
  if (!title) fields.title = "見出しは必須です";
  else if (title.length > MAX.title) fields.title = `見出しは${MAX.title}文字以内で入力してください`;

  const jobCategory = str(raw.jobCategory);
  if (!jobCategory) fields.jobCategory = "職種は必須です";
  else if (!(VALID_JOB_CATEGORIES as string[]).includes(jobCategory)) fields.jobCategory = "職種の指定が不正です";

  const employmentType = str(raw.employmentType);
  if (!employmentType) fields.employmentType = "雇用形態は必須です";
  else if (!(VALID_EMPLOYMENT_TYPES as string[]).includes(employmentType)) fields.employmentType = "雇用形態の指定が不正です";

  const salary = str(raw.salary);
  if (salary && salary.length > MAX.salary) fields.salary = `給与は${MAX.salary}文字以内で入力してください`;

  const description = str(raw.description);
  if (!description) fields.description = "仕事内容は必須です";
  else if (description.length > MAX.description) fields.description = `仕事内容は${MAX.description}文字以内で入力してください`;

  const applyUrl = str(raw.applyUrl);
  if (applyUrl) {
    if (applyUrl.length > MAX.applyUrl) fields.applyUrl = `応募先URLは${MAX.applyUrl}文字以内で入力してください`;
    else if (!isHttpUrl(applyUrl)) fields.applyUrl = "応募先URLは http(s):// で始まる正しいURLを入力してください";
  }

  const applyContact = str(raw.applyContact);
  if (applyContact && applyContact.length > MAX.applyContact) fields.applyContact = `応募先連絡先は${MAX.applyContact}文字以内で入力してください`;

  // 応募導線は URL か連絡先のどちらか必須（PIIを持たず外部で受けるため）。
  if (!applyUrl && !applyContact) {
    fields.applyContact = "応募先URLまたは連絡先のいずれかを入力してください";
  }

  if (Object.keys(fields).length > 0) throw new JobValidationError(fields);

  return {
    pharmacyName,
    prefecture,
    city: city || undefined,
    title,
    jobCategory: jobCategory as JobCategory,
    employmentType: employmentType as EmploymentType,
    salary: salary || undefined,
    description,
    applyUrl: applyUrl || undefined,
    applyContact: applyContact || undefined,
  };
}

// 検証済み入力から新規 JobPosting を生成する（id/editToken/日時を付与）。
export function normalizeJob(clean: CleanJobInput): JobPosting {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    editToken: randomUUID(),
    status: "pending",
    featured: false,
    createdAt: now,
    updatedAt: now,
    ...clean,
  };
}

// 編集トークンを除いた公開用の形に変換する。
export function publicJob(job: JobPosting): PublicJob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { editToken, ...rest } = job;
  return rest;
}

export interface QueryJobsOptions {
  prefecture?: string;
  // 管理画面用。true なら pending/closed も含めて全件返す。
  includeAll?: boolean;
}

// 公開一覧を取得する。既定では published のみ。featured優先→新着順。
export async function queryJobs(opts: QueryJobsOptions = {}): Promise<JobPosting[]> {
  const { allJobs } = await import("./store");
  const all = await allJobs();
  let rows = all;
  if (!opts.includeAll) rows = rows.filter((j) => j.status === "published");
  if (opts.prefecture) rows = rows.filter((j) => j.prefecture === opts.prefecture);
  rows = rows.slice().sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return rows;
}

// 1件取得（存在しなければ null）。
export async function getJob(id: string): Promise<JobPosting | null> {
  const { allJobs } = await import("./store");
  const all = await allJobs();
  return all.find((j) => j.id === id) ?? null;
}

// 投稿を保存（新規作成）。検証→正規化→永続化して返す。
export async function createJob(raw: RawJobInput): Promise<JobPosting> {
  const clean = validateJobInput(raw);
  const job = normalizeJob(clean);
  const { saveJob } = await import("./store");
  await saveJob(job);
  return job;
}
