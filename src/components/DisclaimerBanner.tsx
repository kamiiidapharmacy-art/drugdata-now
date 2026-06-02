"use client";

import { useState } from "react";
import { AlertTriangleIcon, ChevronDownIcon } from "./icons";

export function DisclaimerBanner({ latestVerifiedDate }: { latestVerifiedDate: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--brand-soft)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mx-auto flex w-full max-w-4xl cursor-pointer items-center gap-2 px-4 py-2 text-left sm:px-6"
      >
        <span className="shrink-0" style={{ color: "var(--brand)" }}>
          <AlertTriangleIcon size={14} />
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-relaxed" style={{ color: open ? "var(--text-muted)" : "var(--text-sub)" }}>
          {open ? (
            <>
              <strong className="font-semibold" style={{ color: "var(--text)" }}>【免責事項】</strong>{" "}
              本サイトの情報は一次情報（厚労省・日薬連・PMDA等）の定期集計と現場情報の補助レイヤーで構成された「代替薬選定のための参考データ」です。実際の在庫状況を保証するものではありません。最終的な調剤および臨床判断は各医療従事者の責任において行ってください。
              {latestVerifiedDate ? ` 最終確認日: ${latestVerifiedDate}` : ""}
            </>
          ) : (
            <>
              本サイトの情報は、<strong className="font-semibold" style={{ color: "var(--text-muted)" }}>PMDA・厚生労働省等の公開情報</strong>に基づく参考データです。
              <span className="ml-1 underline" style={{ color: "var(--brand)" }}>情報の出典について</span>
            </>
          )}
        </span>
        <span className="shrink-0 transition-transform" style={{ color: "var(--brand)", transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDownIcon size={14} />
        </span>
      </button>
    </div>
  );
}
