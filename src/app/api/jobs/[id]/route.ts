import { NextRequest, NextResponse } from "next/server";
import { getJob, publicJob, validateJobInput, JobValidationError } from "@/lib/jobs";
import { saveJob, deleteJob } from "@/lib/store";
import type { JobPosting, JobStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUS: JobStatus[] = ["pending", "published", "closed"];

// 管理者かどうか（ADMIN_TOKEN）。未設定の開発環境では false 扱い。
function isAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

// 投稿者本人か（編集トークン一致）。
function hasEditToken(req: NextRequest, job: JobPosting): boolean {
  const t = req.headers.get("x-edit-token");
  return !!t && t === job.editToken;
}

// 公開詳細。published は誰でも、それ以外は管理者か本人のみ。
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (job.status !== "published" && !isAdmin(req) && !hasEditToken(req, job)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ job: publicJob(job) });
}

// 編集。本人（editToken）は内容更新、管理者は status/featured も変更可。
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const admin = isAdmin(req);
  const owner = hasEditToken(req, job);
  if (!admin && !owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    let next: JobPosting = { ...job };

    // 内容フィールドの更新（本人・管理者どちらも可）。content キーがあるときだけ検証。
    const hasContent =
      ["pharmacyName", "prefecture", "city", "title", "jobCategory", "employmentType", "salary", "description", "applyUrl", "applyContact"].some(
        (k) => k in raw,
      );
    if (hasContent) {
      const clean = validateJobInput({ ...job, ...raw });
      next = { ...next, ...clean };
    }

    // 管理者専用フィールド。
    if (admin) {
      if (typeof raw.status === "string") {
        if (!VALID_STATUS.includes(raw.status as JobStatus)) {
          return NextResponse.json({ error: "invalid status" }, { status: 400 });
        }
        next.status = raw.status as JobStatus;
      }
      if (typeof raw.featured === "boolean") next.featured = raw.featured;
    } else {
      // 本人が募集終了にするのは許可（published→closed のみ）。
      if (raw.status === "closed" && job.status === "published") next.status = "closed";
    }

    next.updatedAt = new Date().toISOString();
    await saveJob(next);
    return NextResponse.json({ ok: true, job: publicJob(next) });
  } catch (e) {
    if (e instanceof JobValidationError) {
      return NextResponse.json({ ok: false, error: e.message, fields: e.fields }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}

// 削除。本人（editToken）または管理者。
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isAdmin(req) && !hasEditToken(req, job)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteJob(id);
  return NextResponse.json({ ok: true });
}
