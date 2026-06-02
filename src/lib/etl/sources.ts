import type { SourceAdapter } from "./adapter";
import { fetchMhlwRaws } from "./mhlw";

// 各ソースの実装。fetch は RawDrugInput[] を返し、正規化は ingestRaws が行う。
// ⚠️ 商用利用・再配布の可否は各ソースの規約確認が前提。
// 厚労省: 公共データ利用規約(PDL1.0)で出典明示のうえ商用再配布可（2026-06 時点 確認済）。

export const mhlwAdapter: SourceAdapter = {
  id: "mhlw",
  label: "厚労省 医療用医薬品供給状況報告",
  sourceType: "厚労省",
  cadence: "monthly",
  async fetch() {
    // 出典ページから最新の供給状況Excelを特定→ダウンロード→パース。
    return fetchMhlwRaws();
  },
};

export const nichiyakurenAdapter: SourceAdapter = {
  id: "nichiyakuren",
  label: "日薬連 供給状況調査",
  sourceType: "日薬連",
  cadence: "monthly",
  async fetch() {
    // TODO: 日薬連の供給状況Excelを取得→パース。
    return [];
  },
};

export const pmdaAdapter: SourceAdapter = {
  id: "pmda",
  label: "PMDA 回収・添付文書改訂",
  sourceType: "PMDA",
  cadence: "daily",
  async fetch() {
    // TODO: PMDAの回収情報等を取得（比較的構造化されている）。
    return [];
  },
};

export const snsAdapter: SourceAdapter = {
  id: "sns",
  label: "SNS現場情報（速報・要裏取り）",
  sourceType: "SNS",
  cadence: "hourly",
  async fetch() {
    // TODO: 収集済みSNS情報をLLMで集計し fieldIntel として付与。
    return [];
  },
};

export const officialAdapters: SourceAdapter[] = [mhlwAdapter, nichiyakurenAdapter, pmdaAdapter];
export const allAdapters: SourceAdapter[] = [...officialAdapters, snsAdapter];
