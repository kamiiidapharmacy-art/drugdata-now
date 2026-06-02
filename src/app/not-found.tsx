import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="text-5xl font-bold" style={{ color: "var(--brand)" }}>
        404
      </div>
      <h1 className="mt-3 text-xl font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>
        お探しの医薬品・ページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg px-4 py-2 text-sm font-bold text-white"
        style={{ background: "var(--brand)" }}
      >
        医薬品一覧へ戻る
      </Link>
    </div>
  );
}
