import { NextRequest, NextResponse } from "next/server";
import { ingest, ingestRaws } from "@/lib/etl/ingest";
import { parseXlsx } from "@/lib/etl/xlsx";
import type { SourceType } from "@/lib/types";

export const runtime = "nodejs";

const VALID_SOURCE: SourceType[] = ["厚労省", "日薬連", "PMDA", "メーカー", "SNS", "不明"];

// 公式データ取り込みエンドポイント（CSV / JSON / Excel）。
// 本番は ADMIN_TOKEN env で保護（未設定の開発時は誰でも可）。
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const sp = req.nextUrl.searchParams;
    const formatParam = sp.get("format");
    const format = formatParam === "json" ? "json" : formatParam === "xlsx" ? "xlsx" : "csv";
    const sourceParam = sp.get("source") ?? "不明";
    const source = (VALID_SOURCE.includes(sourceParam as SourceType) ? sourceParam : "不明") as SourceType;

    if (format === "xlsx") {
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return NextResponse.json({ error: "ファイルが空です" }, { status: 400 });
      const raws = await parseXlsx(buf);
      const outcome = await ingestRaws(raws, { source, format: "xlsx" });
      return NextResponse.json({ ok: true, ...outcome });
    }

    const text = await req.text();
    if (!text.trim()) return NextResponse.json({ error: "本文が空です" }, { status: 400 });
    const outcome = await ingest({ text, format, source });
    return NextResponse.json({ ok: true, ...outcome });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
