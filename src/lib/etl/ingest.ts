import { normalizeRecord, NormalizeError, type RawDrugInput } from "../normalize";
import { parseByContentType } from "./parse";
import { upsertDrugs, appendIngestLog, type IngestLogEntry, type UpsertDiff } from "../store";
import type { SourceType } from "../types";

export interface IngestOutcome {
  received: number;
  accepted: number;
  rejected: number;
  errors: string[];
  diff: UpsertDiff;
}

// 正規化済みの生入力を取り込む共通コア（CSV/JSON/Excel いずれの入口からも使う）。
export async function ingestRaws(
  raws: RawDrugInput[],
  opts: { source: SourceType; format: string },
): Promise<IngestOutcome> {
  const { source, format } = opts;
  const records = [];
  const errors: string[] = [];
  for (const raw of raws) {
    try {
      records.push(normalizeRecord({ ...raw, sourceType: raw.sourceType || source }));
    } catch (e) {
      errors.push(e instanceof NormalizeError ? e.message : String(e));
    }
  }

  const diff = await upsertDrugs(records);

  const logEntry: IngestLogEntry = {
    ranAt: new Date().toISOString(),
    source,
    format,
    received: raws.length,
    diff,
    errors,
  };
  await appendIngestLog(logEntry);

  return { received: raws.length, accepted: records.length, rejected: errors.length, errors, diff };
}

// テキスト（CSV/JSON）からの取り込み。
export function ingest(opts: { text: string; format: "csv" | "json"; source: SourceType }): Promise<IngestOutcome> {
  const raws = parseByContentType(opts.text, opts.format);
  return ingestRaws(raws, { source: opts.source, format: opts.format });
}
