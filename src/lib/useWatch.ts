"use client";

import { useCallback, useEffect, useState } from "react";

// 採用品ウォッチ（MVPはlocalStorage。P2でアカウント＋サーバ保存に移行）。
const KEY = "watched_yj_codes";

export function useWatch() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setWatched(new Set(JSON.parse(raw)));
    } catch {}
    setReady(true);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setWatched(new Set(next));
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {}
  }, []);

  const toggle = useCallback(
    (yjCode: string) => {
      const next = new Set(watched);
      if (next.has(yjCode)) next.delete(yjCode);
      else next.add(yjCode);
      persist(next);
    },
    [watched, persist],
  );

  const isWatched = useCallback((yjCode: string) => watched.has(yjCode), [watched]);

  return { watched, isWatched, toggle, ready, count: watched.size };
}
