"use client";

import { usePathname } from "next/navigation";
import { useWatch } from "@/lib/useWatch";
import { BriefcaseIcon, StarIcon } from "./icons";

export function Header({ latestVerifiedDate }: { latestVerifiedDate?: string | null }) {
  const pathname = usePathname();
  const onJobs = pathname?.startsWith("/jobs");
  const watch = useWatch();

  const navBtn = "tap flex items-center rounded-md px-3 text-[13px] font-semibold transition";

  function navStyle(active: boolean): React.CSSProperties {
    return active
      ? { background: "var(--brand-soft)", border: "1px solid var(--border-strong)", color: "var(--brand)" }
      : { background: "transparent", border: "1px solid transparent", color: "var(--text-muted)" };
  }

  return (
    <header
      className="sticky top-0 z-20"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-black text-white"
            style={{
              background: "linear-gradient(155deg, var(--brand) 0%, var(--brand-deep) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
            }}
          >
            Rx
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-bold leading-tight sm:text-[19px]" style={{ color: "var(--text)" }}>
              欠品・代替薬ナビ
            </span>
            {latestVerifiedDate && (
              <span className="mt-0.5 hidden text-[11.5px] sm:block tnum" style={{ color: "var(--text-sub)" }}>
                最終更新 {latestVerifiedDate}
              </span>
            )}
          </span>
        </a>

        <nav className="flex shrink-0 items-center gap-1.5">
          <a
            href="/"
            aria-current={!onJobs ? "page" : undefined}
            className={`${navBtn} hidden sm:flex`}
            style={navStyle(!onJobs)}
          >
            欠品情報
          </a>
          <a href="/jobs" aria-current={onJobs ? "page" : undefined} className={`${navBtn} gap-1.5`} style={navStyle(!!onJobs)}>
            <BriefcaseIcon size={15} />
            求人
          </a>
          {!onJobs && (
            <span
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold sm:inline-flex"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              title="ウォッチ中の採用品"
            >
              <span style={{ color: "var(--brand)" }}>
                <StarIcon size={14} filled />
              </span>
              ウォッチ <span className="tnum" style={{ color: "var(--text)" }}>{watch.ready ? watch.count : 0}</span>
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
