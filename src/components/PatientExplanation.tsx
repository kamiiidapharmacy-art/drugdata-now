"use client";

import { useState } from "react";
import type { DrugRecord } from "@/lib/types";
import { buildPatientExplanation } from "@/lib/patientExplanation";
import { PatientIcon, CopyIcon, CheckIcon } from "./icons";

// 患者さんへの服薬説明「文例（テンプレート）」ブロック。
// 保有データから組み立てた“たたき台”を表示し、ワンタップでコピーできる。
// 医療的事実（用法用量・副作用）は空欄プレースホルダで、薬剤師が一次情報から記入する前提。
export function PatientExplanation({ drug }: { drug: DrugRecord }) {
  const text = buildPatientExplanation(drug);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボード非対応/権限なしのときは何もしない（テキストは画面に出ている）
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-bold" style={{ color: "var(--text)" }}>
          <span style={{ color: "var(--brand)" }}>
            <PatientIcon size={17} />
          </span>
          患者さんへの説明文例
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-sub)" }}>
            （テンプレート）
          </span>
        </h2>
        <button
          type="button"
          onClick={onCopy}
          className="tap inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition hover:opacity-90"
          style={{
            background: copied ? "var(--status-green-soft)" : "var(--surface)",
            color: copied ? "var(--status-green)" : "var(--brand)",
            border: `1px solid ${copied ? "var(--status-green)" : "var(--border-strong)"}`,
          }}
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>

      <div
        className="whitespace-pre-wrap rounded-lg p-3.5 text-[13.5px] leading-relaxed"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        {text}
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--text-sub)" }}>
        ※この文例は、本サイトが保有する基本情報（販売名・一般名・薬効分類・供給状況・代替候補）から
        自動生成した“たたき台”です。効能・用法・用量・副作用などの医療情報は含めていません。
        実際の説明前に必ず添付文書・くすりのしおり等の一次情報をご確認のうえ、最終的な服薬指導内容は
        薬剤師の責任で確定してください。
      </p>
    </div>
  );
}
