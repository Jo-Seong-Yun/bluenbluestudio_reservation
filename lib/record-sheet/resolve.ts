import { isOptionTag, optionTagLabel, type RecordSheetRow } from "./schema";
import type { RecordSheetTags } from "./build-data";

export type ResolvedRow =
  | { type: "title"; text: string }
  | { type: "section"; text: string }
  | {
      type: "field";
      label: string;
      sublabel?: string;
      value: string;
      value2?: string;
      align?: "left" | "center" | "right";
      wideLabel?: boolean;
    }
  | { type: "note"; lines: string[]; align: "left" | "center"; small: boolean }
  | { type: "spacer" };

type OptionItem = { label: string; price: number };

/** 태그 하나를 실제 값 문자열로 바꾼다. "option:이름" 형태면 이
 * 예약에서 그 이름의 옵션이 실제로 선택됐는지 optionItems에서 찾고,
 * 아니면 RecordSheetTags에서 그대로 찾는다. */
function resolveTagValue(
  tag: string,
  tags: RecordSheetTags,
  optionItems: OptionItem[],
): string {
  if (isOptionTag(tag)) {
    const label = optionTagLabel(tag);
    const item = optionItems.find((it) => it.label === label);
    return item ? item.price.toLocaleString() : "";
  }
  return (tags as unknown as Record<string, string>)[tag] ?? "";
}

/** note 텍스트 안의 {계좌} 같은 자리표시자를 실제 값으로 바꾼다. */
function substituteTags(text: string, tags: RecordSheetTags): string {
  return text.replace(/\{([^}]+)\}/g, (whole, key: string) => {
    const value = (tags as unknown as Record<string, string>)[key];
    return value ?? whole;
  });
}

/**
 * 관리자가 편집한 행 구성(RecordSheetRow[])과 예약 하나의 실제 값
 * (tags, optionItems)을 합쳐, 화면(record-sheet-view.tsx)이 그대로
 * 그릴 수 있는 형태로 만든다. 어떤 예약이든 이 함수 하나를 거쳐야
 * 화면에 나오므로, 행 구성을 바꾸면 다음 인쇄 미리보기부터 즉시
 * 반영된다.
 */
export function resolveRecordSheetRows(
  rows: RecordSheetRow[],
  tags: RecordSheetTags,
  optionItems: OptionItem[],
): ResolvedRow[] {
  return rows.map((row): ResolvedRow => {
    if (row.type === "title") return { type: "title", text: row.text };
    if (row.type === "section") return { type: "section", text: row.text };
    if (row.type === "spacer") return { type: "spacer" };

    if (row.type === "note") {
      return {
        type: "note",
        lines: substituteTags(row.text, tags).split("\n"),
        align: row.align ?? "left",
        small: row.small ?? false,
      };
    }

    const rawValue = resolveTagValue(row.tag, tags, optionItems);
    const value = rawValue ? `${row.prefix ?? ""}${rawValue}${row.suffix ?? ""}` : "";
    let value2: string | undefined;
    if (row.tag2) {
      const raw2 = resolveTagValue(row.tag2, tags, optionItems);
      value2 = raw2 ? `${row.prefix2 ?? ""}${raw2}` : "";
    }

    return {
      type: "field",
      label: row.label,
      sublabel: row.sublabel,
      value,
      value2,
      align: row.align,
      wideLabel: row.wideLabel,
    };
  });
}
