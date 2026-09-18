import { describe, expect, it } from "vitest";
import {
  priceForOption,
  selectedLabelsFromAnswers,
  selectedPricedOptions,
  type CustomField,
} from "./custom-fields-shared";

function field(overrides: Partial<CustomField>): CustomField {
  return {
    id: "field-1",
    product_id: "product-1",
    label: "추가옵션(유료)",
    type: "multi_choice",
    options: ["흑백영상 추가제공", "독백대본 1개 추가", "없음"],
    option_prices: [10000, 20000, 0],
    description: null,
    required: false,
    active: true,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("priceForOption", () => {
  it("옵션 인덱스에 맞는 가격을 돌려준다", () => {
    const f = field({});
    expect(priceForOption(f, "흑백영상 추가제공")).toBe(10000);
    expect(priceForOption(f, "독백대본 1개 추가")).toBe(20000);
    expect(priceForOption(f, "없음")).toBe(0);
  });

  it("option_prices가 없으면 0을 돌려준다(가격 없는 문항)", () => {
    const f = field({ option_prices: null });
    expect(priceForOption(f, "흑백영상 추가제공")).toBe(0);
  });

  it("목록에 없는 라벨이면 0을 돌려준다", () => {
    const f = field({});
    expect(priceForOption(f, "존재하지않는옵션")).toBe(0);
  });
});

describe("selectedPricedOptions", () => {
  it("고른 옵션 중 가격이 0이 아닌 것만 돌려준다", () => {
    const f = field({});
    const selected = new Map([[f.id, ["흑백영상 추가제공", "없음"]]]);
    const items = selectedPricedOptions([f], selected);
    expect(items).toEqual([
      { fieldId: f.id, label: "흑백영상 추가제공", price: 10000 },
    ]);
  });

  it("option_prices가 없는 문항은 계산에서 빠진다", () => {
    const priced = field({ id: "priced" });
    const plain = field({
      id: "plain",
      option_prices: null,
      options: ["남성", "여성"],
    });
    const selected = new Map([
      ["priced", ["독백대본 1개 추가"]],
      ["plain", ["남성"]],
    ]);
    const items = selectedPricedOptions([priced, plain], selected);
    expect(items).toEqual([
      { fieldId: "priced", label: "독백대본 1개 추가", price: 20000 },
    ]);
  });

  it("아무것도 안 고르면 빈 배열", () => {
    const f = field({});
    expect(selectedPricedOptions([f], new Map())).toEqual([]);
  });
});

describe("selectedLabelsFromAnswers", () => {
  it("multi_choice 답변(JSON 배열 문자열)을 라벨 배열로 되돌린다", () => {
    const f = field({});
    const answers = [
      { fieldId: f.id, value: JSON.stringify(["흑백영상 추가제공", "없음"]) },
    ];
    const result = selectedLabelsFromAnswers([f], answers);
    expect(result.get(f.id)).toEqual(["흑백영상 추가제공", "없음"]);
  });

  it("single_choice 답변(원본 문자열 그대로)을 배열 하나로 감싼다", () => {
    const f = field({ id: "gender", type: "single_choice", options: ["남", "여"], option_prices: null });
    const answers = [{ fieldId: "gender", value: "남" }];
    const result = selectedLabelsFromAnswers([f], answers);
    expect(result.get("gender")).toEqual(["남"]);
  });

  it("깨진 JSON이면 그 문항은 결과에서 빠진다(던지지 않는다)", () => {
    const f = field({});
    const answers = [{ fieldId: f.id, value: "이건 JSON이 아님" }];
    const result = selectedLabelsFromAnswers([f], answers);
    expect(result.has(f.id)).toBe(false);
  });

  it("모르는 fieldId는 무시한다", () => {
    const f = field({});
    const answers = [{ fieldId: "존재안함", value: "무언가" }];
    const result = selectedLabelsFromAnswers([f], answers);
    expect(result.size).toBe(0);
  });
});
