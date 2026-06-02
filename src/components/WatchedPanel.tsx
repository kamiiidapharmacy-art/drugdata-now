"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DrugRecord, SupplyStatus, DrugsApiResponse } from "@/lib/types";
import { STATUS_ACCENT, STATUS_SOFT } from "@/lib/status";
import { AlertTriangleIcon, PillIcon, ClockIcon, ChevronDownIcon, StarIcon } from "./icons";

// ウォッチ中（=採用品）の薬を、検索枠の下にダッシュボードとして常時表示する。
// 欠品・限定出荷のものを上に浮かせ、通常出荷は折りたたむ。
// データは /api/drugs?yj=... の一括取得。ホーム(DrugExplorer)の待機状態に埋め込む。
const RISK_STATUSES: SupplyStatus[] = ["供給停止", "販売中止", "限定出荷"];

function StatusDot({ status }: { status: SupplyStatus }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: STATUS_ACCENT[status] }}
    />
  );
}

function StatusPill({ status }: { status: SupplyStatus }) {
  const s = STATUS_SOFT[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      <StatusDot status={status} />
      {status}
    </span>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="flex-1 rounded-lg px-3.5 py-2.5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="tnum text-[23px] font-bold leading-none" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
        {label}
      </div>
    </div>
  );
}

function RiskCard({ d }: { d: DrugRecord }) {
  const accent = STATUS_ACCENT[d.supplyStatus];
  return (
    <Link
      href={`/drug/${encodeURIComponent(d.yjCode)}`}
      className="block rounded-lg transition hover:-translate-y-px"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[15px] font-bold leading-tight" style={{ color: "var(--text)" }}>
              <span className="shrink-0" style={{ color: accent }}>
                <PillIcon size={16} />
              </span>
              <span className="truncate">{d.brandName || d.originalDrug}</span>
            </div>
            {d.ingredient && (
              <div className="mt-0.5 truncate text-[12px]" style={{ color: "var(--text-sub)" }}>
                {d.ingredient}
                {d.representativeSpec ? `・${d.representativeSpec}` : ""}
              </div>
            )}
          </div>
          <StatusPill status={d.supplyStatus} />
        </div>

        {d.shortageReason && (
          <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {d.shortageReason}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: "var(--text-sub)" }}>
          {d.recoveryOutlook && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={13} />
              {d.recoveryOutlook}
            </span>
          )}
          {d.alternatives.length > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--brand)" }}>
              代替候補 {d.alternatives.length} 件
            </span>
          )}
          <span className="ml-auto">確認 {d.verifiedAt}</span>
        </div>
      </div>
    </Link>
  );
}

export function WatchedPanel({ codes }: { codes: string[] }) {
  const key = codes.join(",");
  const [rows, setRows] = useState<DrugRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showNormal, setShowNormal] = useState(false);

  useEffect(() => {
    if (key === "") {
      setRows([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch(`/api/drugs?yj=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: DrugsApiResponse) => {
        if (!alive) return;
        if (d.error) setErr(d.error);
        setRows(d.rows ?? []);
      })
      .catch((e) => {
        if (alive) setErr(String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const risk = useMemo(() => (rows ?? []).filter((d) => RISK_STATUSES.includes(d.supplyStatus)), [rows]);
  const normal = useMemo(() => (rows ?? []).filter((d) => d.supplyStatus === "通常出荷"), [rows]);
  const total = (rows ?? []).length;

  return (
    <section className="mt-4">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span style={{ color: "var(--brand)" }}>
          <StarIcon size={16} filled />
        </span>
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
          ウォッチ中の採用品（{total}）
        </h2>
      </div>

      {err && (
        <div className="rounded-lg px-3.5 py-2 text-[13px]" style={{ background: STATUS_SOFT["供給停止"].bg, color: STATUS_SOFT["供給停止"].fg }}>
          読み込みエラー: {err}
        </div>
      )}

      {loading && rows === null && (
        <div className="grid gap-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton rounded-xl" style={{ height: 96 }} />
          ))}
        </div>
      )}

      {rows !== null && total > 0 && (
        <>
          <div className="flex gap-3">
            <StatTile label="採用品" value={total} accent="var(--brand)" />
            <StatTile label="欠品・注意" value={risk.length} accent="var(--status-red)" />
            <StatTile label="通常出荷" value={normal.length} accent="var(--status-green)" />
          </div>

          <div className="mt-5">
            <div className="mb-2.5 flex items-center gap-2">
              <span style={{ color: "var(--status-red)" }}>
                <AlertTriangleIcon size={16} />
              </span>
              <h3 className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
                対応が必要（{risk.length}）
              </h3>
            </div>
            {risk.length === 0 ? (
              <div
                className="rounded-xl px-4 py-5 text-center text-[13px]"
                style={{ background: STATUS_SOFT["通常出荷"].bg, color: STATUS_SOFT["通常出荷"].fg, border: `1px solid ${STATUS_SOFT["通常出荷"].border}` }}
              >
                いま欠品・限定出荷になっているウォッチ品はありません。
              </div>
            ) : (
              <div className="grid gap-2.5">
                {risk.map((d) => (
                  <RiskCard key={d.yjCode} d={d} />
                ))}
              </div>
            )}
          </div>

          {normal.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowNormal((v) => !v)}
                aria-expanded={showNormal}
                className="flex w-full items-center gap-2 text-left"
              >
                <StatusDot status="通常出荷" />
                <h3 className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  通常出荷（{normal.length}）
                </h3>
                <span className="ml-auto shrink-0 transition-transform" style={{ color: "var(--text-sub)", transform: showNormal ? "rotate(180deg)" : "none" }}>
                  <ChevronDownIcon size={16} />
                </span>
              </button>
              {showNormal && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {normal.map((d) => (
                    <Link
                      key={d.yjCode}
                      href={`/drug/${encodeURIComponent(d.yjCode)}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                    >
                      <StatusDot status="通常出荷" />
                      {d.brandName || d.originalDrug}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
