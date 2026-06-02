import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMhlwSupplyStatus, mhlwDateToIso } from "../src/lib/etl/mhlw.ts";

test("丸数字つき供給状況を4区分に正規化", () => {
  assert.equal(normalizeMhlwSupplyStatus("①通常出荷").status, "通常出荷");
  assert.equal(normalizeMhlwSupplyStatus("⑤供給停止").status, "供給停止");
});

test("限定出荷は括弧内事由を理由として切り出す", () => {
  const a = normalizeMhlwSupplyStatus("②限定出荷（自社の事情）");
  assert.equal(a.status, "限定出荷");
  assert.equal(a.reason, "自社の事情");
  const b = normalizeMhlwSupplyStatus("③限定出荷（他社品の影響）");
  assert.equal(b.status, "限定出荷");
  assert.equal(b.reason, "他社品の影響");
});

test("4区分に当てはまらなければ status は空", () => {
  assert.equal(normalizeMhlwSupplyStatus("不明な値").status, "");
});

test("YYMMDD を YYYY-MM-DD に変換", () => {
  assert.equal(mhlwDateToIso("260601"), "2026-06-01");
  assert.equal(mhlwDateToIso("251231"), "2025-12-31");
});
