import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseJson } from "../src/lib/etl/parse.ts";

test("parseCsv: ヘッダ対応・空行無視", () => {
  const csv = "yjCode,originalDrug\n1234567A1010,テスト薬\n\n";
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].yjCode, "1234567A1010");
  assert.equal(rows[0].originalDrug, "テスト薬");
});

test("parseCsv: クォート内のカンマ・改行・エスケープを保持", () => {
  const csv = 'yjCode,clinicalNotes\n1234567A1010,"注意1,注意2\n続き ""引用"" あり"';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].clinicalNotes, '注意1,注意2\n続き "引用" あり');
});

test("parseCsv: ヘッダのみ/空入力は空配列", () => {
  assert.deepEqual(parseCsv("yjCode,originalDrug\n"), []);
  assert.deepEqual(parseCsv(""), []);
});

test("parseJson: 配列をそのまま", () => {
  const rows = parseJson('[{"yjCode":"X"}]');
  assert.equal(rows[0].yjCode, "X");
});

test("parseJson: {rows:[...]} 形式", () => {
  const rows = parseJson('{"rows":[{"yjCode":"Y"}]}');
  assert.equal(rows[0].yjCode, "Y");
});

test("parseJson: 不正な形は例外", () => {
  assert.throws(() => parseJson('{"foo":1}'));
});
