"use client";

import { useState } from "react";
import Link from "next/link";
import type { DrugRecord, Equivalence } from "@/lib/types";
import { STATUS_ACCENT, STATUS_SOFT } from "@/lib/status";
import { recordRecentlyViewed } from "@/lib/useRecentlyViewed";
import { PillIcon, FileTextIcon, PatientIcon, StarIcon, ChevronDownIcon } from "./icons";

// 疑義照会要否の「参考」判定ラベル。自動抽出の同等性シグナルから機械的に付与する。
// ※医療判断ではなく参考。最終判断は薬剤師が行う前提（カード下部に注意書き）。
const GIGI_META: Record<Equivalence, { label: string; bg: string; fg: string }> = {
  same_spec: { label: "疑義照会: 不要の場合あり", bg: "#dcfce7", fg: "#166534" },
  diff_spec: { label: "疑義照会: 必要な可能性（規格差）", bg: "#fef3c7", fg: "#92400e" },
};

const extLinkCls =
  "tap inline-flex items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition hover:opacity-90";

export function DrugCard({
  drug,
  watched,
  onToggleWatch,
}: {
  drug: DrugRecord;
  watched: boolean;
  onToggleWatch: (yjCode: string) => void;
}) {
  const accent = STATUS_ACCENT[drug.supplyStatus];
  const soft = STATUS_SOFT[drug.supplyStatus];
  const snsSource = drug.sourceType === "SNS";
  // 代替候補は縦に嵩張るため初期は折りたたみ、件数だけ見せて任意で展開する。
  const [altOpen, setAltOpen] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-lg sm:flex"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 本体（販売名・一般名・規格・代替・現場情報・外部リンク） */}
      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold"
            style={{ background: soft.bg, color: soft.fg, border: `1px solid ${soft.border}` }}
          >
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
            {drug.supplyStatus}
          </span>
          {drug.confidence === "速報" && (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--status-yellow-soft)", color: "var(--status-yellow)" }}
            >
              速報・要確認
            </span>
          )}
        </div>
        <h3 className="mt-2 text-[17px] font-bold leading-snug" style={{ color: "var(--text)" }}>
          <Link
            href={`/drug/${encodeURIComponent(drug.yjCode)}`}
            className="hover:underline"
            onClick={() =>
              recordRecentlyViewed({
                yjCode: drug.yjCode,
                name: drug.originalDrug,
                status: drug.supplyStatus,
              })
            }
          >
            {drug.originalDrug}
          </Link>
        </h3>
        {drug.ingredient && (
          <div className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            一般名: {drug.ingredient}
          </div>
        )}
        {drug.brandName && drug.brandName !== drug.originalDrug && (
          <div className="text-[12.5px]" style={{ color: "var(--text-sub)" }}>
            先発: {drug.brandName}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]" style={{ color: "var(--text-sub)" }}>
          <span>{drug.therapeuticClass}</span>
          <span aria-hidden style={{ color: "var(--border-strong)" }}>|</span>
          <span>{drug.representativeSpec}</span>
          <span aria-hidden style={{ color: "var(--border-strong)" }}>|</span>
          <span className="tnum">YJ {drug.yjCode}</span>
        </div>

      {(drug.shortageReason || drug.recoveryOutlook) && (
        <div className="mt-3 rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
          {drug.shortageReason && <div>欠品理由: {drug.shortageReason}</div>}
          {drug.recoveryOutlook && <div>解消見込み: {drug.recoveryOutlook}</div>}
        </div>
      )}

      {drug.alternatives.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setAltOpen((v) => !v)}
            aria-expanded={altOpen}
            className="tap flex w-full items-center justify-between gap-2 rounded-md px-3 text-left transition hover:opacity-90"
            style={{
              background: altOpen ? "var(--surface-2)" : "var(--brand-soft)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "var(--brand)" }}>
              <PillIcon size={15} />
              代替候補 <span className="tnum">{drug.alternatives.length}</span> 件
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--brand)" }}>
              {altOpen ? "閉じる" : "表示する"}
              <span className="transition-transform" style={{ transform: altOpen ? "rotate(180deg)" : "none" }}>
                <ChevronDownIcon size={15} />
              </span>
            </span>
          </button>
          {altOpen && (
            <>
          <ul className="mt-2 space-y-2">
            {drug.alternatives.map((a, i) => {
              const gigi = a.equivalence ? GIGI_META[a.equivalence] : undefined;
              return (
                <li key={i} className="text-[13px]" style={{ color: "var(--text)" }}>
                  <div className="flex items-start gap-1.5">
                    <PillIcon size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--text-sub)" }} />
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
                      className="mt-1 ml-[21px] inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
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
            ※「疑義照会」は同成分・同規格かの自動判定にもとづく参考表示です。後発品への変更可否・患者同意・力価・適応・剤形は薬剤師がご確認ください。
          </p>
            </>
          )}
        </div>
      )}

      {drug.fieldIntel.length > 0 && (
        <div className="mt-3 rounded-md p-2.5" style={{ background: "var(--violet-tint)", border: "1px solid var(--violet-border)" }}>
          {drug.fieldIntel.map((f, i) => (
            <div key={i} className="text-[12px]" style={{ color: "var(--violet-text)" }}>
              <span className="font-semibold">現場情報 [{f.label}] {f.observedAt}</span>
              {f.postedBy ? ` (${f.postedBy})` : ""}: {f.summary}
              {f.note && <span className="opacity-80"> ／ {f.note}</span>}
            </div>
          ))}
        </div>
      )}

        {/* 添付文書・患者向け説明の公的サイトへのリンク（補助ボタン＝控えめ） */}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://www.pmda.go.jp/PmdaSearch/rdSearch/02/${encodeURIComponent(drug.yjCode)}`}
            target="_blank"
            rel="noreferrer"
            className={extLinkCls}
            style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
          >
            <FileTextIcon size={15} />
            添付文書（PMDA）
          </a>
          <a
            href="https://www.rad-ar.or.jp/siori/"
            target="_blank"
            rel="noreferrer"
            className={extLinkCls}
            style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
          >
            <PatientIcon size={15} />
            くすりのしおり公式（検索）
          </a>
        </div>
      </div>

      {/* メタ／操作列: 確定日・出典・元資料・ウォッチ（参考③の右カラム） */}
      <div
        className="flex shrink-0 flex-col gap-3 border-t p-4 sm:w-44 sm:border-l sm:border-t-0"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-start gap-6 sm:flex-col sm:gap-3">
          <div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--text-sub)" }}>確定日</div>
            <div className="tnum mt-0.5 text-[13px] font-semibold" style={{ color: "var(--text)" }}>{drug.verifiedAt}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--text-sub)" }}>出典</div>
            <div className="mt-0.5 text-[13px] font-semibold" style={{ color: snsSource ? "var(--status-yellow)" : "var(--text)" }}>
              {drug.sourceType}
            </div>
            {drug.sourceUrl && (
              <a href={drug.sourceUrl} target="_blank" rel="noreferrer" className="text-[12px] underline" style={{ color: "var(--brand)" }}>
                元資料
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleWatch(drug.yjCode)}
          aria-pressed={watched}
          title={watched ? "ウォッチ解除" : "採用品としてウォッチ"}
          className="tap inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition sm:mt-auto"
          style={{
            background: watched ? "var(--brand)" : "var(--surface)",
            color: watched ? "#fff" : "var(--brand)",
            border: `1px solid ${watched ? "var(--brand)" : "var(--border-strong)"}`,
          }}
        >
          <StarIcon size={15} filled={watched} />
          {watched ? "ウォッチ中" : "ウォッチ"}
        </button>
      </div>
    </div>
  );
}
