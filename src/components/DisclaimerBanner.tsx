"use client";

import { useState } from "react";

export function DisclaimerBanner({ latestVerifiedDate }: { latestVerifiedDate: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--status-yellow-soft)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-2 px-4 py-2.5 text-left"
      >
        <span className="mt-0.5 shrink-0" style={{ color: "var(--status-yellow)" }}>
          ⚠
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>
          {open ? (
            <>
              <strong className="font-semibold">【免責事項】</strong>{" "}
              本サイトの情報は一次情報（厚労省・日薬連・PMDA等）の定期集計と現場情報の補助レイヤーで構成された「代替薬選定のための参考データ」です。実際の在庫状況を保証するものではありません。最終的な調剤および臨床判断は各医療従事者の責任において行ってください。
              {latestVerifiedDate ? ` 最終確認日: ${latestVerifiedDate}` : ""}
            </>
          ) : (
            <>
              <strong className="font-semibold">参考データ（要確認）</strong> — タップで免責事項
            </>
          )}
        </span>
        <span className="mt-0.5 shrink-0" style={{ color: "var(--status-yellow)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
    </div>
  );
}
