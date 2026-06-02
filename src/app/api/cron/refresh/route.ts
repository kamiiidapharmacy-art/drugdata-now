import { NextRequest, NextResponse } from "next/server";
import { refresh } from "@/lib/etl";

// 厚労省Excel（約16,000行）のダウンロード＋パースに時間がかかるため上限を延長。
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Vercel Cron から叩かれる取り込みエンドポイント。
// 本番では CRON_SECRET で保護する（vercel.json の crons から Authorization 付きで呼ばれる）。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const scopeParam = req.nextUrl.searchParams.get("source");
  const scope = scopeParam === "official" || scopeParam === "sns" ? scopeParam : "all";

  const results = await refresh(scope);
  return NextResponse.json({ ok: true, scope, results });
}
