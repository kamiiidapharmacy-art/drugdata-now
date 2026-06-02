import { NextRequest, NextResponse } from "next/server";
import { queryDrugs } from "@/lib/db";
import type { SupplyStatus, SourceType, DrugsApiResponse } from "@/lib/types";

const VALID_STATUS: SupplyStatus[] = ["通常出荷", "限定出荷", "供給停止", "販売中止"];
const VALID_SOURCE: SourceType[] = ["厚労省", "日薬連", "PMDA", "メーカー", "SNS", "不明"];

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const all = sp.get("all") === "1";
    const offset = Math.max(0, Number(sp.get("offset") ?? "0") || 0);
    const yjParam = sp.get("yj");
    const limit = all || yjParam ? 100000 : 30;

    const q = sp.get("q") ?? undefined;
    const yjCodes = sp.get("yj")?.split(",").map((s) => s.trim()).filter(Boolean) ?? undefined;
    const statuses = (sp.get("status")?.split(",").filter(Boolean) ?? []).filter((s): s is SupplyStatus =>
      VALID_STATUS.includes(s as SupplyStatus),
    );
    const sources = (sp.get("source")?.split(",").filter(Boolean) ?? []).filter((s): s is SourceType =>
      VALID_SOURCE.includes(s as SourceType),
    );
    const confidenceOnly = sp.get("confidence") === "確定";
    const sortParam = sp.get("sort");
    const sort =
      sortParam === "verified_desc" || sortParam === "name_asc" ? sortParam : "intel_freshness";

    const result = await queryDrugs({ q, yjCodes, statuses, sources, confidenceOnly, sort, offset, limit });

    const body: DrugsApiResponse = { ...result };
    return NextResponse.json(body, {
      headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const body: DrugsApiResponse = {
      rows: [],
      total: 0,
      hasMore: false,
      nextOffset: null,
      latestVerifiedDate: null,
      error: String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
