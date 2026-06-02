"use client";

import { useState } from "react";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, PREFECTURES, type PublicJob } from "@/lib/types";

const inputStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
} as const;

type Fields = {
  pharmacyName: string;
  prefecture: string;
  city: string;
  title: string;
  jobCategory: string;
  employmentType: string;
  salary: string;
  description: string;
  applyUrl: string;
  applyContact: string;
};

function fromJob(job?: PublicJob): Fields {
  return {
    pharmacyName: job?.pharmacyName ?? "",
    prefecture: job?.prefecture ?? "",
    city: job?.city ?? "",
    title: job?.title ?? "",
    jobCategory: job?.jobCategory ?? JOB_CATEGORIES[0],
    employmentType: job?.employmentType ?? EMPLOYMENT_TYPES[0],
    salary: job?.salary ?? "",
    description: job?.description ?? "",
    applyUrl: job?.applyUrl ?? "",
    applyContact: job?.applyContact ?? "",
  };
}

// mode="new": POST /api/jobs（投稿）。mode="edit": PATCH /api/jobs/[id]（要 editToken）。
export function JobForm({ mode, job }: { mode: "new" | "edit"; job?: PublicJob }) {
  const [f, setF] = useState<Fields>(fromJob(job));
  const [editToken, setEditToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; editToken: string } | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof Fields>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setBusy(true);
    setErrors({});
    setGlobalError(null);
    try {
      const payload = {
        pharmacyName: f.pharmacyName,
        prefecture: f.prefecture,
        city: f.city || undefined,
        title: f.title,
        jobCategory: f.jobCategory,
        employmentType: f.employmentType,
        salary: f.salary || undefined,
        description: f.description,
        applyUrl: f.applyUrl || undefined,
        applyContact: f.applyContact || undefined,
      };
      const url = mode === "new" ? "/api/jobs" : `/api/jobs/${job!.id}`;
      const res = await fetch(url, {
        method: mode === "new" ? "POST" : "PATCH",
        headers: {
          "content-type": "application/json",
          ...(mode === "edit" ? { "x-edit-token": editToken } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (mode === "new") setCreated({ id: data.id, editToken: data.editToken });
      else setDone(true);
    } catch (e) {
      setGlobalError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("この求人を削除します。よろしいですか？")) return;
    setBusy(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/jobs/${job!.id}`, {
        method: "DELETE",
        headers: { "x-edit-token": editToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDone(true);
    } catch (e) {
      setGlobalError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--status-green)" }}>
          投稿を受け付けました（審査後に公開されます）
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>
          下の「編集トークン」は、後から内容を修正・削除するために必要です。必ず控えてください（再表示できません）。
        </p>
        <div className="mt-3 rounded-lg p-3 font-mono text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div>掲載ID: {created.id}</div>
          <div className="mt-1 break-all">編集トークン: {created.editToken}</div>
        </div>
        <a href={`/jobs/${created.id}/edit`} className="mt-3 inline-block text-sm underline" style={{ color: "var(--brand)" }}>
          編集ページへ
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--status-green)" }}>
          更新しました
        </h2>
        <a href="/jobs" className="mt-3 inline-block text-sm underline" style={{ color: "var(--brand)" }}>
          求人一覧へ
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "edit" && (
        <Field label="編集トークン（投稿時に控えたもの）" error={undefined}>
          <input
            value={editToken}
            onChange={(e) => setEditToken(e.target.value)}
            placeholder="投稿時に表示されたトークン"
            className="w-full rounded-md px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="薬局名 *" error={errors.pharmacyName}>
          <input value={f.pharmacyName} onChange={(e) => set("pharmacyName", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
        </Field>
        <Field label="見出し * 例: 薬剤師（正社員）募集" error={errors.title}>
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
        </Field>
        <Field label="都道府県 *" error={errors.prefecture}>
          <select value={f.prefecture} onChange={(e) => set("prefecture", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle}>
            <option value="">選択してください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="市区町村" error={errors.city}>
          <input value={f.city} onChange={(e) => set("city", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
        </Field>
        <Field label="職種 *" error={errors.jobCategory}>
          <select value={f.jobCategory} onChange={(e) => set("jobCategory", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle}>
            {JOB_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="雇用形態 *" error={errors.employmentType}>
          <select value={f.employmentType} onChange={(e) => set("employmentType", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle}>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="給与（例: 月給30万円〜 / 時給2,000円〜）" error={errors.salary}>
        <input value={f.salary} onChange={(e) => set("salary", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
      </Field>

      <Field label="仕事内容 *" error={errors.description}>
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={8} className="w-full rounded-md p-2 text-sm" style={inputStyle} />
      </Field>

      <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <p className="mb-2 text-xs" style={{ color: "var(--text-sub)" }}>
          応募はURLか連絡先のどちらかが必須です（応募者の個人情報は当サイトでは扱いません）。
        </p>
        <Field label="応募先URL（自社採用ページ等）" error={errors.applyUrl}>
          <input value={f.applyUrl} onChange={(e) => set("applyUrl", e.target.value)} placeholder="https://..." className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
        </Field>
        <div className="mt-3">
          <Field label="応募先連絡先（メール / 電話）" error={errors.applyContact}>
            <input value={f.applyContact} onChange={(e) => set("applyContact", e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
          </Field>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          {globalError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--brand)" }}>
          {busy ? "送信中…" : mode === "new" ? "この内容で掲載を申請" : "更新する"}
        </button>
        {mode === "edit" && (
          <button type="button" onClick={remove} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50" style={{ background: "var(--surface)", border: "1px solid var(--status-red)", color: "var(--status-red)" }}>
            削除
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold" style={{ color: "var(--text-sub)" }}>
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs" style={{ color: "var(--status-red)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
