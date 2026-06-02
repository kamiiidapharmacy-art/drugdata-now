import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { JobForm } from "@/components/JobForm";
import { getJob, publicJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
        <Link href={`/jobs/${id}`} className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 求人詳細へ
        </Link>
        <h1 className="mt-3 text-2xl font-bold">求人の編集・削除</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
          投稿時に控えた「編集トークン」を入力してください。
        </p>
        <div className="mt-5">
          <JobForm mode="edit" job={publicJob(job)} />
        </div>
      </div>
    </div>
  );
}
