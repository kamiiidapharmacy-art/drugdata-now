import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDiff } from "../src/lib/storage/types.ts";

const rec = (yjCode: string, supplyStatus: string) =>
  ({ yjCode, originalDrug: `薬${yjCode}`, supplyStatus }) as any;

test("新規は inserted、from=null", () => {
  const diff = computeDiff(new Map(), [rec("A", "限定出荷")]);
  assert.equal(diff.inserted, 1);
  assert.equal(diff.updatedStatus, 0);
  assert.equal(diff.changes[0].from, null);
  assert.equal(diff.changes[0].to, "限定出荷");
});

test("同じ状況は unchanged（changes に積まない）", () => {
  const prev = new Map([["A", "限定出荷"]]);
  const diff = computeDiff(prev, [rec("A", "限定出荷")]);
  assert.equal(diff.unchanged, 1);
  assert.equal(diff.inserted, 0);
  assert.equal(diff.changes.length, 0);
});

test("状況変化は updatedStatus、from=旧状況", () => {
  const prev = new Map([["A", "限定出荷"]]);
  const diff = computeDiff(prev, [rec("A", "供給停止")]);
  assert.equal(diff.updatedStatus, 1);
  assert.equal(diff.changes[0].from, "限定出荷");
  assert.equal(diff.changes[0].to, "供給停止");
});

test("混在: 新規+変化+据置を同時に集計", () => {
  const prev = new Map([
    ["A", "通常出荷"],
    ["B", "限定出荷"],
  ]);
  const diff = computeDiff(prev, [rec("A", "供給停止"), rec("B", "限定出荷"), rec("C", "販売中止")]);
  assert.equal(diff.inserted, 1);
  assert.equal(diff.updatedStatus, 1);
  assert.equal(diff.unchanged, 1);
  assert.equal(diff.changes.length, 2);
});
