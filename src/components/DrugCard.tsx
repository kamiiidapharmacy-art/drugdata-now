"use client";

import Link from "next/link";
import type { DrugRecord, SupplyStatus, SourceType } from "@/lib/types";

const STATUS_STYLE: Record<SupplyStatus, { dot: string; bg: string; fg: string; border: string }> = {
  通常出荷: { dot: "🟢", bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" },
  限定出荷: { dot: "🟡", bg: "#fef9c3", fg: "#854d0e", border: "#fde68a" },
  供給停止: { dot: "🔴", bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" },
  販売中止: { dot: "⛔", bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" },
};

const SOURCE_STYLE: Record<SourceType, { fg: string; bg: string }> = {
  厚労省: { fg: "#1e40af", bg: "#dbeafe" },
  日薬連: { fg: "#1e40af", bg: "#dbeafe" },
  PMDA: { fg: "#3730a3", bg: "#e0e7ff" },
  メーカー: { fg: "#065f46", bg: "#d1fae5" },
  SNS: { fg: "#9a3412", bg: "#ffedd5" },
  不明: { fg: "#4b5563", bg: "#f3f4f6" },
};

export function DrugCard({
  drug,
  watched,
  onToggleWatch,
}: {
  drug: DrugRecord;
  watched: boolean;
  onToggleWatch: (yjCode: string) => void;
}) {
  const s = STATUS_STYLE[drug.supplyStatus];
  const src = SOURCE_STYLE[drug.sourceType];

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
            >
              {s.dot} {drug.supplyStatus}
            </span>
            {drug.confidence === "速報" && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: "#ffedd5", color: "#9a3412" }}
              >
                速報・要確認
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[16px] font-bold" style={{ color: "var(--text)" }}>
            <Link href={`/drug/${encodeURIComponent(drug.yjCode)}`} className="hover:underline">
              {drug.originalDrug}
            </Link>
          </h3>
          {drug.brandName && drug.brandName !== drug.originalDrug && (
            <div className="text-[13px]" style={{ color: "var(--text-sub)" }}>
              先発: {drug.brandName}
            </div>
          )}
          <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-sub)" }}>
            {drug.therapeuticClass} ・ {drug.representativeSpec} ・ YJ: {drug.yjCode}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleWatch(drug.yjCode)}
          aria-pressed={watched}
          title={watched ? "ウォッチ解除" : "採用品としてウォッチ"}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition"
          style={{
            background: watched ? "var(--brand)" : "var(--surface)",
            color: watched ? "#fff" : "var(--brand)",
            border: `1px solid ${watched ? "var(--brand)" : "var(--border-strong)"}`,
          }}
        >
          {watched ? "★ ウォッチ中" : "☆ ウォッチ"}
        </button>
      </div>

      {(drug.shortageReason || drug.recoveryOutlook) && (
        <div className="mt-3 text-[13px]" style={{ color: "var(--text-muted)" }}>
          {drug.shortageReason && <div>欠品理由: {drug.shortageReason}</div>}
          {drug.recoveryOutlook && <div>解消見込み: {drug.recoveryOutlook}</div>}
        </div>
      )}

      {drug.alternatives.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] font-semibold" style={{ color: "var(--text-sub)" }}>
            代替候補
          </div>
          <ul className="mt-1 space-y-1">
            {drug.alternatives.map((a, i) => (
              <li key={i} className="text-[13px]" style={{ color: "var(--text)" }}>
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

      {drug.fieldIntel.length > 0 && (
        <div className="mt-3 rounded-lg p-2" style={{ background: "var(--violet-tint)", border: "1px solid var(--violet-border)" }}>
          {drug.fieldIntel.map((f, i) => (
            <div key={i} className="text-[12px]" style={{ color: "var(--violet-text)" }}>
              <span className="font-semibold">現場情報 [{f.label}] {f.observedAt}</span>
              {f.postedBy ? ` (${f.postedBy})` : ""}: {f.summary}
              {f.note && <span className="opacity-80"> ／ {f.note}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-sub)" }}>
        <span
          className="rounded px-1.5 py-0.5 font-semibold"
          style={{ background: src.bg, color: src.fg }}
        >
          出典: {drug.sourceType}
        </span>
        <span>
          確認日 {drug.verifiedAt}
          {drug.sourceUrl && (
            <a href={drug.sourceUrl} target="_blank" rel="noreferrer" className="ml-2 underline" style={{ color: "var(--brand)" }}>
              元資料
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
