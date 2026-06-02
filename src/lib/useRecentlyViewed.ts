"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupplyStatus } from "./types";

// 「最近見た薬」。localStorageのみ・個人情報なし。最大8件・新しい順・YJで重複排除。
const KEY = "recently_viewed_drugs";
const MAX = 8;

export interface RecentDrug {
  yjCode: string;
  name: string;
  status: SupplyStatus;
}

// 一覧/詳細から呼ぶ記録関数（フックの外でも使えるよう単独関数で提供）。
export function recordRecentlyViewed(d: RecentDrug) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentDrug[] = raw ? JSON.parse(raw) : [];
    const next = [d, ...list.filter((x) => x.yjCode !== d.yjCode)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    // 同一タブ内の購読フックへ通知
    window.dispatchEvent(new CustomEvent("recently-viewed-changed"));
  } catch {}
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentDrug[]>([]);

  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    read();
    const onChange = () => read();
    window.addEventListener("recently-viewed-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("recently-viewed-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [read]);

  return { items, record: recordRecentlyViewed };
}
