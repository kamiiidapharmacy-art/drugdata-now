import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildNormalSupplyIndex,
  autoAlternativesFor,
  enrichWithAutoAlternatives,
} from "../src/lib/alternatives.ts";

const rec = (over: Partial<any>): any => ({
  id: `rec-${over.yjCode}`,
  yjCode: over.yjCode,
  originalDrug: over.originalDrug ?? `薬${over.yjCode}`,
  ingredient: over.ingredient,
  representativeSpec: over.representativeSpec,
  supplyStatus: over.supplyStatus,
  alternatives: over.alternatives ?? [],
  warningTags: [],
  clinicalNotes: [],
  fieldIntel: [],
  sourceType: "厚労省",
  sourceDetail: "",
  verifiedAt: "2026-06-01",
  confidence: "確定",
});

test("通常出荷の薬には自動代替を出さない", () => {
  const all = [rec({ yjCode: "A", ingredient: "アムロジピン", supplyStatus: "通常出荷" })];
  const idx = buildNormalSupplyIndex(all);
  assert.equal(autoAlternativesFor(all[0], idx).length, 0);
});

test("供給停止の薬に同成分・通常出荷を代替提示", () => {
  const all = [
    rec({ yjCode: "A", ingredient: "アムロジピン", supplyStatus: "供給停止" }),
    rec({ yjCode: "B", ingredient: "アムロジピン", supplyStatus: "通常出荷" }),
    rec({ yjCode: "C", ingredient: "別成分", supplyStatus: "通常出荷" }),
  ];
  const idx = buildNormalSupplyIndex(all);
  const alts = autoAlternativesFor(all[0], idx);
  assert.equal(alts.length, 1);
  assert.equal(alts[0].yjCode, "B");
});

test("同規格を優先して並べる", () => {
  const all = [
    rec({ yjCode: "A", ingredient: "X", representativeSpec: "5mg", supplyStatus: "限定出荷" }),
    rec({ yjCode: "B", ingredient: "X", representativeSpec: "10mg", supplyStatus: "通常出荷" }),
    rec({ yjCode: "C", ingredient: "X", representativeSpec: "5mg", supplyStatus: "通常出荷" }),
  ];
  const idx = buildNormalSupplyIndex(all);
  const alts = autoAlternativesFor(all[0], idx);
  assert.equal(alts[0].yjCode, "C"); // 同規格が先頭
});

test("自分自身は候補に含めない", () => {
  const all = [rec({ yjCode: "A", ingredient: "X", supplyStatus: "限定出荷" })];
  const idx = buildNormalSupplyIndex(all);
  assert.equal(autoAlternativesFor(all[0], idx).length, 0);
});

test("成分名が無ければ提示しない", () => {
  const all = [
    rec({ yjCode: "A", supplyStatus: "供給停止" }),
    rec({ yjCode: "B", supplyStatus: "通常出荷" }),
  ];
  const idx = buildNormalSupplyIndex(all);
  assert.equal(autoAlternativesFor(all[0], idx).length, 0);
});

test("手動代替と重複しないようマージ", () => {
  const all = [
    rec({
      yjCode: "A",
      ingredient: "X",
      supplyStatus: "供給停止",
      alternatives: [{ yjCode: "B", name: "薬B" }],
    }),
    rec({ yjCode: "B", ingredient: "X", supplyStatus: "通常出荷" }),
    rec({ yjCode: "C", ingredient: "X", supplyStatus: "通常出荷" }),
  ];
  const idx = buildNormalSupplyIndex(all);
  const enriched = enrichWithAutoAlternatives(all[0], idx);
  const yjs = enriched.alternatives.map((a) => a.yjCode);
  assert.deepEqual([...new Set(yjs)], yjs); // 重複なし
  assert.ok(yjs.includes("B"));
  assert.ok(yjs.includes("C"));
});
