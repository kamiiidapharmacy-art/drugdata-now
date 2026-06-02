import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPatientExplanation } from "../src/lib/patientExplanation.ts";

const rec = (over: Partial<any>): any => ({
  id: `rec-${over.yjCode ?? "x"}`,
  yjCode: over.yjCode ?? "0000000X0000",
  originalDrug: over.originalDrug ?? "テスト薬",
  brandName: over.brandName,
  ingredient: over.ingredient,
  therapeuticClass: over.therapeuticClass,
  representativeSpec: over.representativeSpec,
  supplyStatus: over.supplyStatus ?? "通常出荷",
  shortageReason: over.shortageReason,
  recoveryOutlook: over.recoveryOutlook,
  alternatives: over.alternatives ?? [],
  warningTags: [],
  clinicalNotes: [],
  fieldIntel: [],
  sourceType: "厚労省",
  sourceDetail: "",
  verifiedAt: "2026-06-01",
  confidence: "確定",
});

const PLACEHOLDER = "【添付文書を確認して記入してください】";

test("医療的事実は生成せず必ず空欄プレースホルダにする", () => {
  const t = buildPatientExplanation(rec({}));
  assert.ok(t.includes(`・用法・用量：${PLACEHOLDER}`));
  assert.ok(t.includes(`・主な副作用：${PLACEHOLDER}`));
  // 効能・副作用の具体名を勝手に作っていないこと（プレースホルダのみ）
  assert.equal(t.split(PLACEHOLDER).length - 1, 3);
});

test("販売名・一般名・薬効分類を文章化する", () => {
  const t = buildPatientExplanation(
    rec({ originalDrug: "カロナール錠", ingredient: "アセトアミノフェン", therapeuticClass: "解熱鎮痛剤" })
  );
  assert.ok(t.includes("カロナール錠"));
  assert.ok(t.includes("一般名: アセトアミノフェン"));
  assert.ok(t.includes("「解熱鎮痛剤」"));
});

test("通常出荷では供給に関する特記を出さない", () => {
  const t = buildPatientExplanation(rec({ supplyStatus: "通常出荷" }));
  assert.ok(!t.includes("入手しにくい"));
  assert.ok(!t.includes("供給が停止"));
});

test("限定出荷では供給状況・理由・代替候補を案内する", () => {
  const t = buildPatientExplanation(
    rec({
      supplyStatus: "限定出荷",
      shortageReason: "製造遅延",
      recoveryOutlook: "2026年7月見込み",
      alternatives: [{ name: "代替薬A" }, { name: "代替薬B" }],
    })
  );
  assert.ok(t.includes("入手しにくい"));
  assert.ok(t.includes("理由: 製造遅延"));
  assert.ok(t.includes("解消の見込み: 2026年7月見込み"));
  assert.ok(t.includes("代替薬A、代替薬B"));
});

test("先発品名があれば併記する", () => {
  const t = buildPatientExplanation(rec({ originalDrug: "後発品", brandName: "先発品" }));
  assert.ok(t.includes("先発: 先発品"));
});
