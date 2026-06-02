"use client";

import { useEffect } from "react";
import { recordRecentlyViewed, type RecentDrug } from "@/lib/useRecentlyViewed";

// 詳細ページ（サーバーコンポーネント）から「最近見た薬」を記録するための小さなクライアント部品。
export function RecentViewRecorder(props: RecentDrug) {
  useEffect(() => {
    recordRecentlyViewed(props);
  }, [props.yjCode]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
