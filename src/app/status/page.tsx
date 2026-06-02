import Link from "next/link";
import { readIngestLog, allDrugs } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const drugs = await allDrugs();
  const log = await readIngestLog();
  const byStatus = drugs.reduce<Record<string, number>>((acc, d) => {
    acc[d.supplyStatus] = (acc[d.supplyStatus] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = drugs.reduce<Record<string, number>>((acc, d) => {
    acc[d.sourceType] = (acc[d.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  const latest = drugs.map((d) => d.verifiedAt).sort((a, b) => b.localeCompare(a))[0] ?? "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">データ状況・更新ログ</h1>
        <Link href="/" className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 一覧へ
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="登録品目" value={String(drugs.length)} />
        <Stat label="最終確認日" value={latest} />
        <Stat label="取り込み回数" value={String(log.length)} />
      </div>

      <Section title="供給状況の内訳">
        {Object.entries(byStatus).map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </Section>

      <Section title="出所の内訳">
        {Object.entries(bySource).map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </Section>

      <h2 className="mt-6 mb-2 text-base font-bold">取り込み履歴</h2>
      {log.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-sub)" }}>
          まだ取り込み履歴はありません。<Link href="/admin" className="underline" style={{ color: "var(--brand)" }}>取り込みページ</Link>から追加できます。
        </p>
      )}
      <div className="space-y-2">
        {log.map((e, i) => (
          <div key={i} className="rounded-lg p-3 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="font-semibold">
              {new Date(e.ranAt).toLocaleString("ja-JP")} ／ {e.source} ／ {e.format.toUpperCase()}
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              受領 {e.received} 件 — 新規 {e.diff.inserted} / 状況変化 {e.diff.updatedStatus} / 変化なし {e.diff.unchanged}
              {e.errors.length > 0 && (
                <span style={{ color: "var(--status-red)" }}> / エラー {e.errors.length} 件</span>
              )}
            </div>
            {e.diff.changes.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-[12px]" style={{ color: "var(--text-sub)" }}>
                {e.diff.changes.slice(0, 8).map((c, j) => (
                  <li key={j}>
                    {c.name}（{c.yjCode}）: {c.from ?? "新規"} → {c.to}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[12px]" style={{ color: "var(--text-sub)" }}>
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      <div className="rounded-lg p-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 text-sm">
      <span>{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
