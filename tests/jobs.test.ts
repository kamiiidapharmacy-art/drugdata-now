import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateJobInput,
  normalizeJob,
  publicJob,
  JobValidationError,
  type RawJobInput,
} from "../src/lib/jobs.ts";

const valid: RawJobInput = {
  pharmacyName: "ささ薬局",
  prefecture: "東京都",
  title: "薬剤師（正社員）募集",
  jobCategory: "薬剤師",
  employmentType: "正社員",
  description: "調剤・服薬指導をお願いします。",
  applyContact: "saiyo@example.com",
};

test("正しい入力は検証を通り正規化される", () => {
  const clean = validateJobInput(valid);
  assert.equal(clean.pharmacyName, "ささ薬局");
  assert.equal(clean.prefecture, "東京都");
  assert.equal(clean.applyContact, "saiyo@example.com");
});

test("必須項目が欠けると JobValidationError", () => {
  assert.throws(
    () => validateJobInput({ ...valid, pharmacyName: "  " }),
    (e: unknown) => e instanceof JobValidationError && "pharmacyName" in e.fields,
  );
});

test("不正な都道府県は弾く", () => {
  assert.throws(
    () => validateJobInput({ ...valid, prefecture: "西京都" }),
    (e: unknown) => e instanceof JobValidationError && "prefecture" in e.fields,
  );
});

test("不正な職種・雇用形態は弾く", () => {
  assert.throws(() => validateJobInput({ ...valid, jobCategory: "社長" }), JobValidationError);
  assert.throws(() => validateJobInput({ ...valid, employmentType: "重役" }), JobValidationError);
});

test("応募URLも連絡先も無ければ弾く", () => {
  assert.throws(
    () => validateJobInput({ ...valid, applyContact: undefined, applyUrl: undefined }),
    (e: unknown) => e instanceof JobValidationError && "applyContact" in e.fields,
  );
});

test("応募URLは http(s) のみ許可", () => {
  assert.throws(
    () => validateJobInput({ ...valid, applyContact: undefined, applyUrl: "javascript:alert(1)" }),
    (e: unknown) => e instanceof JobValidationError && "applyUrl" in e.fields,
  );
  const ok = validateJobInput({ ...valid, applyContact: undefined, applyUrl: "https://example.com/jobs" });
  assert.equal(ok.applyUrl, "https://example.com/jobs");
});

test("normalizeJob は id/editToken/日時を付与し status=pending", () => {
  const job = normalizeJob(validateJobInput(valid));
  assert.ok(job.id.length > 0);
  assert.ok(job.editToken.length > 0);
  assert.equal(job.status, "pending");
  assert.equal(job.featured, false);
  assert.ok(job.createdAt);
  assert.equal(job.createdAt, job.updatedAt);
});

test("publicJob は editToken を落とす", () => {
  const job = normalizeJob(validateJobInput(valid));
  const pub = publicJob(job) as Record<string, unknown>;
  assert.equal("editToken" in pub, false);
  assert.equal(pub.id, job.id);
});

test("長すぎる仕事内容は弾く", () => {
  assert.throws(
    () => validateJobInput({ ...valid, description: "あ".repeat(4001) }),
    (e: unknown) => e instanceof JobValidationError && "description" in e.fields,
  );
});
