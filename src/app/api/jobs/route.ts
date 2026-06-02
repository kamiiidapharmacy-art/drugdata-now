import { NextRequest, NextResponse } from "next/server";
import { createJob, publicJob, queryJobs, JobValidationError } from "@/lib/jobs";
import { PREFECTURES, type JobsApiResponse } from "@/lib/types";

export const runtime = "nodejs";

// 公開求人一覧。?prefecture= で都道府県フィルタ。published のみ返す。
// ?all=1 + ADMIN_TOKEN（Bearer）のときだけ pending/closed も含めて全件返す（審査用）。
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const prefParam = sp.get("prefecture") ?? undefined;
    const prefecture =
      prefParam && (PREFECTURES as readonly string[]).includes(prefParam) ? prefParam : undefined;

    const adminToken = process.env.ADMIN_TOKEN;
    const wantsAll = sp.get("all") === "1";
    const isAdmin = !!adminToken && req.headers.get("authorization") === `Bearer ${adminToken}`;
    const includeAll = wantsAll && isAdmin;

    const jobs = await queryJobs({ prefecture, includeAll });
    const body: JobsApiResponse = { rows: jobs.map(publicJob), total: jobs.length };
    return NextResponse.json(body, {
      headers: includeAll
        ? { "cache-control": "no-store" }
        : { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    const body: JobsApiResponse = { rows: [], total: 0, error: String(e) };
    return NextResponse.json(body, { status: 500 });
  }
}

// 新規求人投稿（誰でも可）。status=pending で受け、審査後に公開。
// レスポンスには編集・削除用の editToken を含める（投稿者本人だけが受け取る）。
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const job = await createJob(raw);
    // 投稿直後だけ editToken を返す（控えてもらう）。
    return NextResponse.json(
      { ok: true, id: job.id, editToken: job.editToken, job: publicJob(job) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof JobValidationError) {
      return NextResponse.json({ ok: false, error: e.message, fields: e.fields }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
