"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicJob, JobStatus } from "@/lib/types";

const statusLabel: Record<JobStatus, string> = {
  pending: "審査待ち",
  published: "公開中",
  closed: "募集終了",
};

export default function JobsAdminPage() {
  const [token, setToken] = useState("");
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  function authHeaders(): Record<string, string> {
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs?all=1", { headers: authHeaders(), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setJobs(data.rows ?? []);
      setLoaded(true);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("削除します。よろしいですか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">求人モデレーション（管理）</h1>
        <Link href="/jobs" className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 求人一覧へ
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold" style={{ color: "var(--text-sub)" }}>
            ADMIN_TOKEN
          </span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            className="rounded-md px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--brand)" }}
        >
          {busy ? "読み込み中…" : "全件読み込み"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {loaded && jobs.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--text-sub)" }}>
          求人はありません。
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {jobs.map((j) => (
          <li key={j.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border-strong)" }}>
                {statusLabel[j.status]}
              </span>
              {j.featured && (
                <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: "var(--brand)" }}>
                  注目
                </span>
              )}
              <span style={{ color: "var(--text-sub)" }}>{j.jobCategory} / {j.employmentType}</span>
            </div>
            <div className="mt-1.5 font-bold">{j.title}</div>
            <div className="text-sm" style={{ color: "var(--text-sub)" }}>
              {j.pharmacyName} ／ {j.prefecture}{j.city ? ` ${j.city}` : ""}
            </div>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm" style={{ color: "var(--text-muted)" }}>
              {j.description}
            </p>
            {(j.applyUrl || j.applyContact) && (
              <div className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>
                応募: {j.applyUrl ?? j.applyContact}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {j.status !== "published" && (
                <Btn onClick={() => patch(j.id, { status: "published" })} disabled={busy} color="var(--status-green)">
                  公開する
                </Btn>
              )}
              {j.status === "published" && (
                <Btn onClick={() => patch(j.id, { status: "closed" })} disabled={busy} color="var(--text-muted)">
                  募集終了
                </Btn>
              )}
              <Btn onClick={() => patch(j.id, { featured: !j.featured })} disabled={busy} color="var(--brand)">
                {j.featured ? "注目を外す" : "注目にする"}
              </Btn>
              <Link href={`/jobs/${j.id}`} className="rounded-lg px-3 py-1.5 text-sm underline" style={{ color: "var(--brand)" }}>
                詳細
              </Link>
              <Btn onClick={() => remove(j.id)} disabled={busy} color="var(--status-red)">
                削除
              </Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Btn({ onClick, disabled, color, children }: { onClick: () => void; disabled: boolean; color: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      style={{ background: "var(--surface)", border: `1px solid ${color}`, color }}
    >
      {children}
    </button>
  );
}
