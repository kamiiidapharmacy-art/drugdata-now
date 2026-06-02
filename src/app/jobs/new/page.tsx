import Link from "next/link";
import { Header } from "@/components/Header";
import { JobForm } from "@/components/JobForm";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
        <Link href="/jobs" className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 求人一覧へ
        </Link>
        <h1 className="mt-3 text-2xl font-bold">求人を掲載する</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
          掲載は無料です。投稿後、運営の確認を経て公開されます。投稿時に表示される「編集トークン」は控えてください。
        </p>
        <div className="mt-5">
          <JobForm mode="new" />
        </div>
      </div>
    </div>
  );
}
