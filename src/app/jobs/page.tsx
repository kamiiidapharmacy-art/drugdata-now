import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { queryJobs, publicJob } from "@/lib/jobs";
import { PREFECTURES } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "薬剤師・薬局の求人",
  description:
    "薬局が直接掲載する薬剤師・登録販売者・調剤事務などの求人。都道府県で絞り込み可能。掲載は無料。",
  alternates: { canonical: "/jobs" },
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ prefecture?: string }>;
}) {
  const sp = await searchParams;
  const prefecture =
    sp.prefecture && (PREFECTURES as readonly string[]).includes(sp.prefecture)
      ? sp.prefecture
      : undefined;

  const jobs = (await queryJobs({ prefecture })).map(publicJob);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">薬剤師・薬局求人</h1>
          <Link
            href="/jobs/new"
            className="rounded-lg px-3 py-2 text-sm font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            ＋ 求人を掲載
          </Link>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
          薬局が直接掲載する求人です。掲載は無料。応募は各掲載の応募先へ直接お願いします。
        </p>

        {/* 都道府県フィルタ（GET） */}
        <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
          <select
            name="prefecture"
            defaultValue={prefecture ?? ""}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="">全国</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            絞り込み
          </button>
          {prefecture && (
            <Link href="/jobs" className="text-sm underline" style={{ color: "var(--brand)" }}>
              解除
            </Link>
          )}
        </form>

        <div className="mt-3 text-sm" style={{ color: "var(--text-sub)" }}>
          {jobs.length}件{prefecture ? `（${prefecture}）` : ""}
        </div>

        <ul className="mt-2 space-y-3">
          {jobs.length === 0 && (
            <li className="rounded-xl p-6 text-center text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-sub)" }}>
              現在、掲載中の求人はありません。
            </li>
          )}
          {jobs.map((j) => (
            <li key={j.id}>
              <Link
                href={`/jobs/${j.id}`}
                className="block rounded-xl p-4 transition hover:opacity-90"
                style={{
                  background: "var(--surface)",
                  border: j.featured ? "1px solid var(--brand)" : "1px solid var(--border)",
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {j.featured && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "var(--brand)" }}>
                      注目
                    </span>
                  )}
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--violet-tint)", color: "var(--violet-text)" }}>
                    {j.jobCategory}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--status-yellow-soft)", color: "var(--status-yellow)" }}>
                    {j.employmentType}
                  </span>
                </div>
                <div className="mt-1.5 text-lg font-bold">{j.title}</div>
                <div className="text-sm" style={{ color: "var(--text-sub)" }}>
                  {j.pharmacyName} ／ {j.prefecture}
                  {j.city ? ` ${j.city}` : ""}
                </div>
                {j.salary && (
                  <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    給与: {j.salary}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
