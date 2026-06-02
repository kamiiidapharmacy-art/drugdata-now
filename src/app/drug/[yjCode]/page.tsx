import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrugByYjCode } from "@/lib/db";
import type { Equivalence } from "@/lib/types";
import { STATUS_ACCENT, STATUS_SOFT } from "@/lib/status";
import { FileTextIcon, PatientIcon, PillIcon } from "@/components/icons";
import { RecentViewRecorder } from "@/components/RecentViewRecorder";

export const dynamic = "force-dynamic";

const GIGI_META: Record<Equivalence, { label: string; bg: string; fg: string }> = {
  same_spec: { label: "疑義照会: 不要の場合あり", bg: "#dcfce7", fg: "#166534" },
  diff_spec: { label: "疑義照会: 必要な可能性（規格差）", bg: "#fef3c7", fg: "#92400e" },
};

export default async function DrugDetail({ params }: { params: Promise<{ yjCode: string }> }) {
  const { yjCode } = await params;
  const drug = await getDrugByYjCode(decodeURIComponent(yjCode));
  if (!drug) notFound();

  const accent = STATUS_ACCENT[drug.supplyStatus];
  const soft = STATUS_SOFT[drug.supplyStatus];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
      <RecentViewRecorder yjCode={drug.yjCode} name={drug.originalDrug} status={drug.supplyStatus} />
      <Link href="/" className="text-sm underline" style={{ color: "var(--brand)" }}>
        ← 一覧へ
      </Link>

      <div className="mt-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ background: soft.bg, color: soft.fg, border: `1px solid ${soft.border}` }}
        >
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
          {drug.supplyStatus}（{drug.confidence}）
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold">{drug.originalDrug}</h1>
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
            {drug.alternatives.map((a, i) => {
              const gigi = a.equivalence ? GIGI_META[a.equivalence] : undefined;
              return (
                <li key={i} className="rounded-lg p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start gap-1.5">
                    <PillIcon size={16} style={{ marginTop: 2, flexShrink: 0, color: "var(--text-sub)" }} />
                    <span>
                      {a.name}
                      {a.note && <span style={{ color: "var(--text-sub)" }}> — {a.note}</span>}
                      {a.insuranceCovered === false && (
                        <span className="ml-1 font-semibold" style={{ color: "var(--status-red)" }}>
                          [保険適用外の可能性]
                        </span>
                      )}
                    </span>
                  </div>
                  {gigi && (
                    <span
                      className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: gigi.bg, color: gigi.fg }}
                    >
                      {gigi.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-sub)" }}>
            ※「疑義照会」は同成分・同規格かの自動判定にもとづく参考表示です。変更可否・患者同意・力価・適応・剤形は薬剤師がご確認ください。
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://www.pmda.go.jp/PmdaSearch/rdSearch/02/${encodeURIComponent(drug.yjCode)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ background: "var(--brand-soft)", color: "var(--brand)", border: "1px solid var(--border)" }}
        >
          <FileTextIcon size={16} />
          添付文書（PMDA）
        </a>
        <a
          href="https://www.rad-ar.or.jp/siori/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ background: "var(--brand-soft)", color: "var(--brand)", border: "1px solid var(--border)" }}
        >
          <PatientIcon size={16} />
          患者向け説明（くすりのしおり）
        </a>
      </div>

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
