import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}｜${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// SNS共有・検索結果向けのOGP画像（1200x630）をコードから生成する。
// 日本語表示のため Noto Sans JP (woff) を埋め込む。
export default async function OgImage() {
  const font = await readFile(
    join(process.cwd(), "src/app/_assets/noto-sans-jp-japanese-700-normal.woff"),
  );

  const dots = ["#16a34a", "#d97706", "#dc2626", "#6b7280"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#ffffff",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "96px",
              height: "96px",
              borderRadius: "24px",
              background: "rgba(255,255,255,0.16)",
              border: "2px solid rgba(255,255,255,0.4)",
              fontSize: "52px",
              fontWeight: 700,
            }}
          >
            Rx
          </div>
          <div style={{ display: "flex", gap: "14px" }}>
            {dots.map((c) => (
              <div key={c} style={{ width: "26px", height: "26px", borderRadius: "50%", background: c }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "84px", fontWeight: 700, marginTop: "40px", letterSpacing: "-1px" }}>
          {SITE.name}
        </div>
        <div style={{ display: "flex", fontSize: "36px", marginTop: "20px", color: "rgba(255,255,255,0.88)" }}>
          {SITE.tagline}
        </div>
        <div style={{ display: "flex", fontSize: "26px", marginTop: "36px", color: "rgba(255,255,255,0.7)" }}>
          厚労省・日薬連・PMDA等の出典つき／薬剤師向けの無料ツール
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }],
    },
  );
}
