"use client";

import { useEffect, useState } from "react";

export function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <div className="sticky top-0 z-20" style={{ background: "var(--brand-deep)" }}>
      <div className="px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black text-white"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              Rx
            </div>
            <div>
              <div className="text-[20px] font-bold leading-tight text-white sm:text-[26px]">
                欠品・代替薬 Copilot Pro
              </div>
              <div className="mt-0.5 text-[12px] sm:text-[14px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                出典・確認日つき / 採用品ウォッチ対応
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="テーマ切替"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)" }}
          >
            {dark ? "☀" : "🌙"}
          </button>
        </div>
      </div>
    </div>
  );
}
