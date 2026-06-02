"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DrugRecord, DrugsApiResponse, SupplyStatus } from "@/lib/types";
import { useWatch } from "@/lib/useWatch";
import { useAlertSettings } from "@/lib/useAlertSettings";
import { DrugCard } from "./DrugCard";
import { AlertSettings } from "./AlertSettings";

const STATUSES: SupplyStatus[] = ["通常出荷", "限定出荷", "供給停止", "販売中止"];
type SortKey = "intel_freshness" | "verified_desc" | "name_asc";

export function DrugExplorer() {
  const [rows, setRows] = useState<DrugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestVerified, setLatestVerified] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<SupplyStatus>>(new Set());
  const [confidenceOnly, setConfidenceOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("intel_freshness");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const watch = useWatch();
  const alerts = useAlertSettings();
  const fetchSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("all", "1");
    if (q.trim()) params.set("q", q.trim());
    if (activeStatuses.size) params.set("status", [...activeStatuses].join(","));
    if (confidenceOnly) params.set("confidence", "確定");
    params.set("sort", sort);
    try {
      const res = await fetch(`/api/drugs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DrugsApiResponse = await res.json();
      if (seq !== fetchSeq.current) return;
      if (data.error) throw new Error(data.error);
      setRows(data.rows ?? []);
      setLatestVerified(data.latestVerifiedDate);
    } catch (e) {
      if (seq !== fetchSeq.current) return;
      setError(String(e));
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [q, activeStatuses, confidenceOnly, sort]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const visible = useMemo(
    () => (watchedOnly ? rows.filter((d) => watch.isWatched(d.yjCode)) : rows),
    [rows, watchedOnly, watch],
  );

  // アラート判定: 有効 かつ ウォッチ中 かつ 通知対象ステータス
  const alertMatches = useMemo(() => {
    if (!alerts.settings.enabled) return [];
    return rows.filter(
      (d) => watch.isWatched(d.yjCode) && alerts.settings.notifyOn.includes(d.supplyStatus),
    );
  }, [rows, watch, alerts.settings]);

  function toggleStatus(s: SupplyStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function resetFilters() {
    setQ("");
    setActiveStatuses(new Set());
    setConfidenceOnly(false);
    setWatchedOnly(false);
  }

  function exportData(format: "csv" | "json") {
    let content: string;
    let mime: string;
    let ext: string;
    if (format === "json") {
      content = JSON.stringify(visible, null, 2);
      mime = "application/json";
      ext = "json";
    } else {
      const cols = ["yjCode", "originalDrug", "brandName", "supplyStatus", "sourceType", "verifiedAt", "shortageReason"] as const;
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [cols.join(",")];
      for (const d of visible) lines.push(cols.map((c) => esc(d[c])).join(","));
      content = lines.join("\n");
      mime = "text/csv";
      ext = "csv";
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `formulary-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
      {alertMatches.length > 0 && (
        <div className="mb-3 rounded-xl p-3" style={{ background: "#fee2e2", border: "1px solid #fecaca" }}>
          <div className="text-sm font-bold" style={{ color: "#991b1b" }}>
            🚨 ウォッチ中の採用品 {alertMatches.length} 件が通知対象の供給状況です
          </div>
          <ul className="mt-1 space-y-0.5 text-[13px]" style={{ color: "#991b1b" }}>
            {alertMatches.map((d) => (
              <li key={d.id}>
                <Link href={`/drug/${encodeURIComponent(d.yjCode)}`} className="underline">
                  {d.originalDrug}
                </Link>{" "}
                — {d.supplyStatus}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertSettings
        open={alertOpen}
        onToggleOpen={() => setAlertOpen((v) => !v)}
        watchedCount={watch.count}
        latestVerified={latestVerified}
        settings={alerts.settings}
        onChange={alerts.update}
      />

      <div className="mt-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="薬名・一般名・YJコード・代替薬で検索"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md px-2 py-1.5 text-sm font-medium outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="intel_freshness">深刻度・鮮度順</option>
          <option value="verified_desc">新着順（確認日）</option>
          <option value="name_asc">薬名昇順</option>
        </select>

        {STATUSES.map((s) => {
          const active = activeStatuses.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={{
                border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
                background: active ? "var(--brand)" : "var(--surface)",
                color: active ? "#fff" : "var(--text-muted)",
              }}
            >
              {s}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setConfidenceOnly((v) => !v)}
          className="rounded-full px-3 py-1.5 text-sm font-medium transition"
          style={{
            border: `1px solid ${confidenceOnly ? "var(--brand)" : "var(--border)"}`,
            background: confidenceOnly ? "var(--brand)" : "var(--surface)",
            color: confidenceOnly ? "#fff" : "var(--text-muted)",
          }}
        >
          確定情報のみ
        </button>

        <button
          type="button"
          onClick={() => setWatchedOnly((v) => !v)}
          className="rounded-full px-3 py-1.5 text-sm font-medium transition"
          style={{
            border: `1px solid ${watchedOnly ? "var(--brand)" : "var(--border)"}`,
            background: watchedOnly ? "var(--brand)" : "var(--surface)",
            color: watchedOnly ? "#fff" : "var(--text-muted)",
          }}
        >
          ★ ウォッチのみ ({watch.count})
        </button>

        <button type="button" onClick={resetFilters} className="text-sm font-medium underline" style={{ color: "var(--brand)" }}>
          リセット
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          {loading ? "読み込み中…" : `${visible.length} 件`}
        </span>
        <div className="flex items-center gap-3 text-[12px]">
          <button type="button" onClick={() => exportData("csv")} className="underline" style={{ color: "var(--brand)" }}>
            CSV出力
          </button>
          <button type="button" onClick={() => exportData("json")} className="underline" style={{ color: "var(--brand)" }}>
            JSON出力
          </button>
          <Link href="/status" className="underline" style={{ color: "var(--brand)" }}>
            データ状況
          </Link>
          <Link href="/admin" className="underline" style={{ color: "var(--brand)" }}>
            取り込み
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          読み込みに失敗しました: {error}
        </div>
      )}

      <div className="mt-3 space-y-3 pb-16">
        {!loading && visible.length === 0 && !error && (
          <div className="rounded-lg p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>
            {watchedOnly ? "ウォッチ中の品目はありません。" : "該当する品目がありません。"}
          </div>
        )}
        {visible.map((d) => (
          <DrugCard key={d.id} drug={d} watched={watch.isWatched(d.yjCode)} onToggleWatch={watch.toggle} />
        ))}
      </div>
    </div>
  );
}
