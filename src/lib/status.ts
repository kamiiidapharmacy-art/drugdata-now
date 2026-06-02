import type { SupplyStatus } from "./types";

// 供給状況のカラーを一元管理する（カード左の色帯・ドット・チップで共通利用）。
// アクセント = 単色（帯・ドット）、soft = チップ用の淡色背景＋文字。
// 供給停止=赤（一時的・要注意）、販売中止=グレー（恒久的・入手不可）で区別する。

export const STATUS_ORDER: SupplyStatus[] = ["通常出荷", "限定出荷", "供給停止", "販売中止"];

// 彩度を抑えた単色（ドット・左帯）。賑やかさを避け、信頼感のある統一トーンに。
export const STATUS_ACCENT: Record<SupplyStatus, string> = {
  通常出荷: "#2f7d51",
  限定出荷: "#c2820f",
  供給停止: "#c13b38",
  販売中止: "#6b7686",
};

// 淡背景＋同系の濃い文字。背景の彩度を落とし“控えめに統一”する（参考②③）。
export const STATUS_SOFT: Record<SupplyStatus, { bg: string; fg: string; border: string }> = {
  通常出荷: { bg: "#eef5f0", fg: "#256b45", border: "#d7e7dd" },
  限定出荷: { bg: "#f8f1e6", fg: "#8a570c", border: "#ecdcc2" },
  供給停止: { bg: "#f9edec", fg: "#a8332f", border: "#eed2d0" },
  販売中止: { bg: "#f2f4f7", fg: "#495465", border: "#e2e6ec" },
};
