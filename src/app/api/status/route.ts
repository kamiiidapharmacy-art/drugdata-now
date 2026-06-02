import { NextResponse } from "next/server";
import { readIngestLog, allDrugs } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const drugs = await allDrugs();
  const byStatus = drugs.reduce<Record<string, number>>((acc, d) => {
    acc[d.supplyStatus] = (acc[d.supplyStatus] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = drugs.reduce<Record<string, number>>((acc, d) => {
    acc[d.sourceType] = (acc[d.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  const latestVerified = drugs.map((d) => d.verifiedAt).sort((a, b) => b.localeCompare(a))[0] ?? null;

  return NextResponse.json({
    total: drugs.length,
    byStatus,
    bySource,
    latestVerified,
    ingestLog: await readIngestLog(),
  });
}
