"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DrugRecord, DrugsApiResponse, SupplyStatus } from "@/lib/types";
import { STATUS_ORDER, STATUS_ACCENT } from "@/lib/status";
import { useWatch } from "@/lib/useWatch";
import { useAlertSettings } from "@/lib/useAlertSettings";
import { useRecentlyViewed } from "@/lib/useRecentlyViewed";
import { DrugCard } from "./DrugCard";
import { AlertSettings } from "./AlertSettings";
import { WatchedPanel } from "./WatchedPanel";
import { SearchIcon, AlertTriangleIcon, ClockIcon, StarIcon } from "./icons";

type SortKey = "intel_freshness" | "verified_desc" | "name_asc";

export function DrugExplorer() {
  const [rows, setRows] = useState<DrugRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [latestVerified, setLatestVerified] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<SupplyStatus>>(new Set());
  const [confidenceOnly, setConfidenceOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("intel_freshness");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const watch = useWatch();
  const alerts = useAlertSettings();
  const recent = useRecentlyViewed();
  const fetchSeq = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // 共有URL（?q=…）やサイト内検索アクションから初期キーワードを受け取る。
  // SSRと初期描画を一致させるため、マウント後に反映する（ハイドレーション安全）。
  useEffect(() => {
    try {
      const u = new URLSearchParams(window.location.search).get("q");
      if (u) setQ(u);
    } catch {}
  }, []);

  // ヘッダーの高さを測り、検索バーをその直下に追従（sticky）させる。
  const [stickyTop, setStickyTop] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setStickyTop(header.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // 「/」キーで検索フォームにフォーカス（入力中は無視）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 検索条件（キーワード / 状態フィルタ / 確定のみ / ウォッチのみ）があるときだけ取得する。
  // 16,000件超を初期表示で全件ロードすると重いため、検索されるまでは取得しない。
  const hasCriteria =
    q.trim() !== "" || activeStatuses.size > 0 || confidenceOnly || watchedOnly;

  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    if (!hasCriteria) {
      setRows([]);
      setSearched(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setSearched(true);
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
  }, [q, activeStatuses, confidenceOnly, sort, watchedOnly, hasCriteria]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const visible = useMemo(
    () => (watchedOnly ? rows.filter((d) => watch.isWatched(d.yjCode)) : rows),
    [rows, watchedOnly, watch],
  );

  // 状態フィルタチップに出す件数（現在の結果セットの内訳）。
  const statusCounts = useMemo(() => {
    const m = {} as Record<SupplyStatus, number>;
    for (const d of visible) m[d.supplyStatus] = (m[d.supplyStatus] ?? 0) + 1;
    return m;
  }, [visible]);

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

  const pill = "tap rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition flex items-center gap-1.5";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
      {alertMatches.length > 0 && (
        <div className="mb-3 rounded-xl p-3" style={{ background: "#fee2e2", border: "1px solid #fecaca" }}>
          <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#991b1b" }}>
            <AlertTriangleIcon size={16} />
            ウォッチ中の採用品 {alertMatches.length} 件が通知対象の供給状況です
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

      {/* 検索ヒーロー＋状態フィルタ（スクロール時はヘッダー直下に追従） */}
      <div
        className="sticky z-10 -mx-4 px-4 pb-2.5 pt-3 sm:-mx-6 sm:px-6"
        style={{ top: stickyTop, background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
            searchRef.current?.blur();
          }}
          className="flex items-stretch gap-2"
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-sub)" }}>
              <SearchIcon size={18} />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="医薬品名（一般名・販売名）・YJコードを入力"
              aria-label="医薬品を検索"
              className="w-full rounded-lg py-2.5 pl-11 pr-3 text-[15px] outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)", boxShadow: "var(--shadow-sm)" }}
            />
          </div>
          <button
            type="submit"
            className="tap shrink-0 rounded-lg px-5 text-[14px] font-bold text-white transition hover:opacity-95"
            style={{ background: "var(--brand)", boxShadow: "var(--shadow-sm)" }}
          >
            検索
          </button>
        </form>

        {!searched && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: "var(--text-sub)" }}>
            <span>例:</span>
            {["カロナール", "アセトアミノフェン", "ロキソニン", "アドレナリン"].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQ(ex)}
                className="underline-offset-2 hover:underline"
                style={{ color: "var(--brand)" }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 -mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2">
            {STATUS_ORDER.map((key) => {
              const active = activeStatuses.has(key);
              const accent = STATUS_ACCENT[key];
              const count = statusCounts[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStatus(key)}
                  aria-pressed={active}
                  className={pill}
                  style={{
                    border: `1px solid ${active ? accent : "var(--border)"}`,
                    background: active ? "var(--surface)" : "var(--surface)",
                    color: active ? accent : "var(--text-muted)",
                    boxShadow: active ? `inset 0 0 0 1px ${accent}` : "none",
                  }}
                >
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
                  {key}
                  {searched && count > 0 && (
                    <span
                      className="tnum rounded px-1.5 text-[11px] font-bold"
                      style={{ background: "var(--surface-2)", color: "var(--text-sub)" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 並び替え＋絞り込みオプション */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="並び替え"
          className="tap rounded-lg px-2.5 text-[13px] font-medium outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="intel_freshness">深刻度・鮮度順</option>
          <option value="verified_desc">新着順（確認日）</option>
          <option value="name_asc">薬名昇順</option>
        </select>

        <button
          type="button"
          onClick={() => setConfidenceOnly((v) => !v)}
          aria-pressed={confidenceOnly}
          className={pill}
          style={{
            border: `1px solid ${confidenceOnly ? "var(--brand)" : "var(--border)"}`,
            background: confidenceOnly ? "var(--brand-soft)" : "var(--surface)",
            color: confidenceOnly ? "var(--brand)" : "var(--text-muted)",
          }}
        >
          確定情報のみ
        </button>

        <button
          type="button"
          onClick={() => setWatchedOnly((v) => !v)}
          aria-pressed={watchedOnly}
          className={pill}
          style={{
            border: `1px solid ${watchedOnly ? "var(--brand)" : "var(--border)"}`,
            background: watchedOnly ? "var(--brand-soft)" : "var(--surface)",
            color: watchedOnly ? "var(--brand)" : "var(--text-muted)",
          }}
        >
          <StarIcon size={14} filled={watchedOnly} />
          ウォッチのみ ({watch.count})
        </button>

        {hasCriteria && (
          <button type="button" onClick={resetFilters} className="ml-auto text-[13px] font-medium underline" style={{ color: "var(--brand)" }}>
            条件をクリア
          </button>
        )}
      </div>

      {/* 件数＋出力 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <span className="text-[13px] font-medium" style={{ color: "var(--text-sub)" }}>
          {loading ? "読み込み中…" : searched ? `${visible.length} 件` : ""}
        </span>
        <div className="flex items-center gap-3 text-[12px]">
          <button type="button" onClick={() => exportData("csv")} disabled={!visible.length} className="underline disabled:opacity-40" style={{ color: "var(--brand)" }}>
            CSV出力
          </button>
          <button type="button" onClick={() => exportData("json")} disabled={!visible.length} className="underline disabled:opacity-40" style={{ color: "var(--brand)" }}>
            JSON出力
          </button>
          <Link href="/status" className="underline" style={{ color: "var(--text-sub)" }}>
            データ状況
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          読み込みに失敗しました: {error}
        </div>
      )}

      {/* ウォッチ中の採用品（待機状態のとき、検索枠の下に常時表示） */}
      {!searched && !loading && !error && watch.count > 0 && (
        <WatchedPanel codes={[...watch.watched]} />
      )}

      {/* 最近見た薬（待機状態のとき） */}
      {!searched && !loading && recent.items.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--text-sub)" }}>
            <ClockIcon size={14} />
            最近見た薬
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.items.map((r) => (
              <Link
                key={r.yjCode}
                href={`/drug/${encodeURIComponent(r.yjCode)}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_ACCENT[r.status] }} />
                {r.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3 pb-16">
        {loading &&
          [0, 1, 2].map((i) => <div key={i} className="skeleton rounded-lg" style={{ height: 132 }} />)}

        {!loading && !searched && !error && watch.count === 0 && (
          <div className="mt-2 rounded-lg p-7" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-start gap-3.5">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <SearchIcon size={22} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
                  医薬品名・一般名・YJコードで検索
                </div>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--text-sub)" }}>
                  供給状況・欠品理由・代替候補を出典つきで確認できます。気になる薬を
                  <span className="mx-0.5 inline-flex align-middle" style={{ color: "var(--brand)" }}><StarIcon size={13} filled /></span>
                  でウォッチすると、検索前の画面に「自局の採用品モニタ」が常時表示されます。
                </p>
                <p className="mt-2 text-[12px]" style={{ color: "var(--text-sub)" }}>
                  約16,000件を収載。負荷軽減のため、検索時のみ読み込みます。
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && searched && visible.length === 0 && !error && (
          <div className="rounded-lg p-8 text-center text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-sub)" }}>
            {watchedOnly ? "ウォッチ中の品目はありません。" : "該当する品目がありません。条件を変えてお試しください。"}
          </div>
        )}

        {!loading &&
          visible.map((d) => (
            <DrugCard key={d.id} drug={d} watched={watch.isWatched(d.yjCode)} onToggleWatch={watch.toggle} />
          ))}
      </div>
    </div>
  );
}
