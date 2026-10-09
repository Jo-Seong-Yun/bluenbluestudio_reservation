import { describe, expect, it } from "vitest";
import { parseChoiceOptions } from "./choice-options";

function form(rows: string[][]) {
  const data = new FormData();
  for (const [label, price, description] of rows) {
    data.append("option", label);
    data.append("optionPrice", price);
    data.append("optionDescription", description);
  }
  return data;
}

describe("선택지 설명 저장", () => {
  it("중간 빈 보기를 지워도 가격과 설명의 연결을 유지합니다", () => {
    expect(
      parseChoiceOptions(
        form([
          ["영상", "10000", " 흑백 제공 "],
          ["", "999", "삭제할 설명"],
          ["대본", "20000", "두 줄\n설명"],
        ]),
      ),
    ).toEqual({
      options: ["영상", "대본"],
      option_prices: [10000, 20000],
      option_descriptions: ["흑백 제공", "두 줄\n설명"],
    });
  });
  it("설명을 모두 지우면 null, 일부만 쓰면 빈 자리를 유지합니다", () => {
    expect(
      parseChoiceOptions(
        form([
          ["A", "", ""],
          ["B", "", ""],
        ]),
      ).option_descriptions,
    ).toBeNull();
    expect(
      parseChoiceOptions(
        form([
          ["A", "", ""],
          ["B", "", "안내"],
        ]),
      ),
    ).toEqual({
      options: ["A", "B"],
      option_prices: null,
      option_descriptions: ["", "안내"],
    });
  });
  it("기존 폼에 설명 값이 없어도 보기와 가격을 보존합니다", () => {
    const data = new FormData();
    data.append("option", "추가");
    data.append("optionPrice", "15000");
    expect(parseChoiceOptions(data)).toEqual({
      options: ["추가"],
      option_prices: [15000],
      option_descriptions: null,
    });
  });
  it("설명 길이를 제한하고 무료·음수 가격의 기존 처리도 유지합니다", () => {
    expect(
      parseChoiceOptions(
        form([
          ["A", "", "x".repeat(1100)],
          ["B", "-5", ""],
        ]),
      ),
    ).toEqual({
      options: ["A", "B"],
      option_prices: [0, 0],
      option_descriptions: ["x".repeat(1000), ""],
    });
  });
});
