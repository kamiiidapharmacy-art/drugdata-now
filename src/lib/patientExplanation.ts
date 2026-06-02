import type { DrugRecord } from "./types";

// 患者さんへの服薬説明「文例（テンプレート）」を、保有データから機械的に組み立てる。
//
// ⚠️ 重要な設計方針:
//   効能・用法・用量・副作用などの「医療的事実」はこのサイトのデータに無いため生成しない。
//   それらは必ず空欄プレースホルダ（【…を確認して記入】）にして、薬剤師が一次情報から埋める。
//   ここで自動生成するのは、販売名・一般名・薬効分類・供給状況・代替候補という
//   “すでに確かなメタ情報”だけを文章化した「たたき台」。最終確定は薬剤師の責任。

const PLACEHOLDER = "【添付文書を確認して記入してください】";

function supplyParagraph(drug: DrugRecord): string[] {
  const lines: string[] = [];
  switch (drug.supplyStatus) {
    case "限定出荷":
      lines.push(
        "現在、このお薬はメーカーの出荷が調整されており、一時的に入手しにくい状況です。"
      );
      break;
    case "供給停止":
      lines.push("現在、このお薬はメーカーからの供給が停止しています。");
      break;
    case "販売中止":
      lines.push("このお薬は販売が中止されています。");
      break;
    case "通常出荷":
    default:
      return lines; // 通常出荷は供給に関する特記なし
  }
  if (drug.shortageReason) lines.push(`理由: ${drug.shortageReason}`);
  if (drug.recoveryOutlook) lines.push(`解消の見込み: ${drug.recoveryOutlook}`);

  if (drug.alternatives.length > 0) {
    const names = drug.alternatives
      .slice(0, 3)
      .map((a) => a.name)
      .join("、");
    const more = drug.alternatives.length > 3 ? " ほか" : "";
    lines.push(
      `同じ成分のお薬（${names}${more}）に変更してお渡しできる場合があります。変更の可否は医師・薬剤師にご相談ください。`
    );
  }
  return lines;
}

// 表示・コピー両用のプレーンテキストを返す。
export function buildPatientExplanation(drug: DrugRecord): string {
  const displayName = drug.brandName && drug.brandName !== drug.originalDrug
    ? `${drug.originalDrug}（先発: ${drug.brandName}）`
    : drug.originalDrug;

  const head = `【お薬の説明】${displayName}`;
  const ing = drug.ingredient ? `一般名: ${drug.ingredient}` : null;
  const cls = drug.therapeuticClass
    ? `このお薬は「${drug.therapeuticClass}」に分類されるお薬です。`
    : null;

  const supply = supplyParagraph(drug);

  const blocks: string[] = [head];
  const sub = [ing, cls].filter(Boolean) as string[];
  if (sub.length) blocks.push(sub.join("\n"));
  if (supply.length) blocks.push(supply.join("\n"));

  blocks.push(
    [
      `・用法・用量：${PLACEHOLDER}`,
      `・主な副作用：${PLACEHOLDER}`,
      `・飲み合わせ／注意：${PLACEHOLDER}`,
    ].join("\n")
  );

  blocks.push("ご不明な点は薬剤師までお声がけください。");

  return blocks.join("\n\n");
}
