"use client";

import { useState } from "react";
import Link from "next/link";

type Format = "csv" | "json" | "xlsx";
const SOURCES = ["厚労省", "日薬連", "PMDA", "メーカー", "SNS"] as const;

const CSV_TEMPLATE =
  "yjCode,originalDrug,brandName,ingredient,therapeuticClass,representativeSpec,supplyStatus,sourceType,sourceDetail,sourceUrl,verifiedAt,confidence,shortageReason,recoveryOutlook,warningTags,clinicalNotes,alternatives";

export default function AdminPage() {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<Format>("csv");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("厚労省");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".xlsx")) {
      setFormat("xlsx");
      setXlsxFile(file);
      setText("");
      return;
    }
    setXlsxFile(null);
    const content = await file.text();
    setText(content);
    if (file.name.endsWith(".json")) setFormat("json");
    else if (file.name.endsWith(".csv")) setFormat("csv");
  }

  const canSubmit = format === "xlsx" ? !!xlsxFile : !!text.trim();

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const isXlsx = format === "xlsx";
      const res = await fetch(`/api/admin/ingest?format=${format}&source=${encodeURIComponent(source)}`, {
        method: "POST",
        headers: {
          "content-type": isXlsx
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/plain",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: isXlsx ? await xlsxFile!.arrayBuffer() : text,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6" style={{ color: "var(--text)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">データ取り込み（管理）</h1>
        <Link href="/" className="text-sm underline" style={{ color: "var(--brand)" }}>
          ← 一覧へ
        </Link>
      </div>

      <p className="text-sm" style={{ color: "var(--text-sub)" }}>
        公式データ（厚労省・日薬連のExcelをCSV書き出ししたもの等）を貼り付け／アップロードして取り込みます。
        YJコードで名寄せし、供給状況の変化を検出します。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          形式
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </label>
        <label className="text-sm">
          出所
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          ADMIN_TOKEN（任意）
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="本番のみ"
            className="mt-1 w-full rounded-md px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />
        </label>
      </div>

      <div className="mt-3">
        <input
          type="file"
          accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFile}
          className="text-sm"
        />
        {format === "xlsx" && (
          <p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>
            {xlsxFile ? `選択中: ${xlsxFile.name}` : "Excelファイルを選択してください。"}
            （Excel取り込みでは下のテキスト欄は使用しません）
          </p>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        disabled={format === "xlsx"}
        placeholder={format === "csv" ? `CSVヘッダ例:\n${CSV_TEMPLATE}` : '[{"yjCode":"...","originalDrug":"...","supplyStatus":"限定出荷","verifiedAt":"2026-06-01"}]'}
        className="mt-3 w-full rounded-lg p-3 font-mono text-xs disabled:opacity-50"
        style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !canSubmit}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--brand)" }}
        >
          {busy ? "取り込み中…" : "取り込む"}
        </button>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE + "\n")}`}
          download="formulary-template.csv"
          className="text-sm underline"
          style={{ color: "var(--brand)" }}
        >
          CSVテンプレートをDL
        </a>
        <Link href="/status" className="text-sm underline" style={{ color: "var(--brand)" }}>
          取り込みログを見る
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}
      {result != null && (
        <pre
          className="mt-4 overflow-auto rounded-lg p-3 text-xs"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
