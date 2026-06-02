import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  // 公開（published）以外は一般には見せない。
  if (!job || job.status !== "published") notFound();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
        <Link href="/jobs" className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 求人一覧へ
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {job.featured && (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "var(--brand)" }}>
              注目
            </span>
          )}
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--violet-tint)", color: "var(--violet-text)" }}>
            {job.jobCategory}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--status-yellow-soft)", color: "var(--status-yellow)" }}>
            {job.employmentType}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold">{job.title}</h1>
        <div className="text-sm" style={{ color: "var(--text-sub)" }}>
          {job.pharmacyName} ／ {job.prefecture}
          {job.city ? ` ${job.city}` : ""}
        </div>

        <div className="mt-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {job.salary && <Field k="給与" v={job.salary} />}
          <div className="py-1 text-sm">
            <div className="mb-1 font-semibold" style={{ color: "var(--text-sub)" }}>
              仕事内容
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-2 font-bold">応募方法</div>
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--brand)" }}
            >
              応募先ページを開く
            </a>
          )}
          {job.applyContact && (
            <div className="mt-2 text-sm">
              連絡先: <span className="font-semibold">{job.applyContact}</span>
            </div>
          )}
          <p className="mt-3 text-xs" style={{ color: "var(--text-sub)" }}>
            ※ 応募は掲載薬局へ直接行ってください。当サイトは応募者の個人情報を取得しません。
          </p>
        </div>

        <div className="mt-4 text-xs" style={{ color: "var(--text-sub)" }}>
          掲載日: {job.createdAt.slice(0, 10)} ／ 更新日: {job.updatedAt.slice(0, 10)}
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>
          掲載内容の編集・削除は{" "}
          <Link href={`/jobs/${job.id}/edit`} className="underline" style={{ color: "var(--brand)" }}>
            こちら
          </Link>
          （投稿時の編集トークンが必要です）
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="w-20 shrink-0 font-semibold" style={{ color: "var(--text-sub)" }}>
        {k}
      </span>
      <span>{v}</span>
    </div>
  );
}
