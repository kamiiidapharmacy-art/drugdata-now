import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrugByYjCode } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DrugDetail({ params }: { params: Promise<{ yjCode: string }> }) {
  const { yjCode } = await params;
  const drug = await getDrugByYjCode(decodeURIComponent(yjCode));
  if (!drug) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
      <Link href="/" className="text-sm underline" style={{ color: "var(--brand)" }}>
        ← 一覧へ
      </Link>

      <h1 className="mt-3 text-2xl font-bold">{drug.originalDrug}</h1>
      {drug.brandName && drug.brandName !== drug.originalDrug && (
        <div className="text-sm" style={{ color: "var(--text-sub)" }}>
          先発: {drug.brandName}
        </div>
      )}

      <div className="mt-4 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <Field k="供給状況" v={`${drug.supplyStatus}（${drug.confidence}）`} />
        <Field k="YJコード" v={drug.yjCode} />
        <Field k="一般名" v={drug.ingredient} />
        <Field k="薬効分類" v={drug.therapeuticClass} />
        <Field k="代表規格" v={drug.representativeSpec} />
        <Field k="欠品理由" v={drug.shortageReason} />
        <Field k="解消見込み" v={drug.recoveryOutlook} />
        <Field k="出所" v={`${drug.sourceType} — ${drug.sourceDetail}`} />
        <Field k="最終確認日" v={drug.verifiedAt} />
        {drug.sourceUrl && (
          <div className="mt-1 text-sm">
            <a href={drug.sourceUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brand)" }}>
              元資料を開く
            </a>
          </div>
        )}
      </div>

      {drug.alternatives.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 font-bold">代替候補</h2>
          <ul className="space-y-1">
            {drug.alternatives.map((a, i) => (
              <li key={i} className="rounded-lg p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                💊 {a.name}
                {a.note && <span style={{ color: "var(--text-sub)" }}> — {a.note}</span>}
                {a.insuranceCovered === false && (
                  <span className="ml-1 font-semibold" style={{ color: "var(--status-red)" }}>
                    [保険適用外の可能性]
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drug.warningTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {drug.warningTags.map((t) => (
            <span key={t} className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--status-yellow-soft)", color: "var(--status-yellow)" }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {drug.fieldIntel.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 font-bold">現場情報（速報・要確認）</h2>
          {drug.fieldIntel.map((f, i) => (
            <div key={i} className="mb-2 rounded-lg p-3 text-sm" style={{ background: "var(--violet-tint)", border: "1px solid var(--violet-border)", color: "var(--violet-text)" }}>
              <div className="font-semibold">
                [{f.label}] {f.observedAt} {f.postedBy ? `(${f.postedBy})` : ""}
              </div>
              <div>{f.summary}</div>
              {f.note && <div className="opacity-80">{f.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="w-24 shrink-0 font-semibold" style={{ color: "var(--text-sub)" }}>
        {k}
      </span>
      <span>{v}</span>
    </div>
  );
}
