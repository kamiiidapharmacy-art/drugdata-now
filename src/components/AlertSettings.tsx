"use client";

import type { SupplyStatus } from "@/lib/types";
import type { AlertSettings as Settings } from "@/lib/useAlertSettings";
import { BellIcon, ChevronDownIcon } from "./icons";

// 欠品アラート設定（課金の核となる機能の土台）。
// 設定の保存は useAlertSettings（localStorage）。
// P3 で通知配信（メール/Web Push/LINE）と Stripe課金に接続する。
const NOTIFY_OPTIONS: SupplyStatus[] = ["限定出荷", "供給停止", "販売中止"];

export function AlertSettings({
  open,
  onToggleOpen,
  watchedCount,
  latestVerified,
  settings,
  onChange,
}: {
  open: boolean;
  onToggleOpen: () => void;
  watchedCount: number;
  latestVerified: string | null;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="rounded-xl" style={{ background: "var(--violet-tint)", border: "1px solid var(--violet-border)" }}>
      <button type="button" onClick={onToggleOpen} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--violet-text)" }}>
          <BellIcon size={16} />
          欠品アラート設定（採用品 {watchedCount} 件をウォッチ中{settings.enabled ? " ・ ON" : " ・ OFF"}）
        </span>
        <span className="shrink-0 transition-transform" style={{ color: "var(--violet-text)", transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDownIcon size={16} />
        </span>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-[12px]" style={{ color: "var(--violet-text)" }}>
            ウォッチ中の採用品が指定の供給状況になると、画面上部に警告を表示します。
            <strong>（デモ: 設定はブラウザ保存。メール等の自動配信はP3で実装）</strong>
          </p>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
            <input type="checkbox" checked={settings.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
            アラートを有効にする
          </label>

          <input
            type="email"
            value={settings.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="通知先メールアドレス（P3で使用）"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />

          <div className="flex flex-wrap gap-2">
            {NOTIFY_OPTIONS.map((st) => {
              const on = settings.notifyOn.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    onChange({ notifyOn: on ? settings.notifyOn.filter((x) => x !== st) : [...settings.notifyOn, st] })
                  }
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    border: `1px solid ${on ? "var(--brand)" : "var(--border)"}`,
                    background: on ? "var(--brand)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {st}で通知
                </button>
              );
            })}
          </div>

          {latestVerified && (
            <div className="text-[11px]" style={{ color: "var(--violet-text)" }}>
              データ最終確認日: {latestVerified}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
