import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRecord, NormalizeError } from "../src/lib/normalize.ts";

const base = {
  yjCode: "1234567A1010",
  originalDrug: "テスト薬",
  supplyStatus: "限定出荷",
  sourceType: "厚労省",
  verifiedAt: "2026-06-01",
};

test("正常系: id は rec-<yjCode>、確定レイヤー", () => {
  const r = normalizeRecord({ ...base });
  assert.equal(r.id, "rec-1234567A1010");
  assert.equal(r.yjCode, "1234567A1010");
  assert.equal(r.supplyStatus, "限定出荷");
  assert.equal(r.confidence, "確定");
});

test("SNS出所は速報レイヤーに自動判定", () => {
  const r = normalizeRecord({ ...base, sourceType: "SNS" });
  assert.equal(r.confidence, "速報");
});

test("未知の出所は不明に丸める", () => {
  const r = normalizeRecord({ ...base, sourceType: "怪文書" });
  assert.equal(r.sourceType, "不明");
});

test("yjCode 欠落で NormalizeError", () => {
  assert.throws(() => normalizeRecord({ ...base, yjCode: "" }), NormalizeError);
});

test("不正な supplyStatus で NormalizeError", () => {
  assert.throws(() => normalizeRecord({ ...base, supplyStatus: "在庫薄" }), NormalizeError);
});

test("verifiedAt が YYYY-MM-DD でないと NormalizeError", () => {
  assert.throws(() => normalizeRecord({ ...base, verifiedAt: "2026/06/01" }), NormalizeError);
});

test("warningTags / clinicalNotes は ; 区切りで配列化", () => {
  const r = normalizeRecord({ ...base, warningTags: "高齢者注意；腎機能", clinicalNotes: "メモA;メモB" });
  assert.deepEqual(r.warningTags, ["高齢者注意", "腎機能"]);
  assert.deepEqual(r.clinicalNotes, ["メモA", "メモB"]);
});

test("alternatives は 名前|備考|保険 を解釈", () => {
  const r = normalizeRecord({ ...base, alternatives: "代替薬X|同効|true;代替薬Y" });
  assert.equal(r.alternatives.length, 2);
  assert.deepEqual(r.alternatives[0], { name: "代替薬X", note: "同効", insuranceCovered: true });
  assert.deepEqual(r.alternatives[1], { name: "代替薬Y" });
});
