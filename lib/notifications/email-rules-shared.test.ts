import { describe, expect, it } from "vitest";
import {
  DAY_OFFSET_TRIGGER_TYPES,
  EMAIL_RECIPIENTS,
  EMAIL_TRIGGER_TYPES,
  EMAIL_VARIABLES,
  EMAIL_VARIABLE_PREVIEW_VALUES,
  renderEmailTemplate,
} from "./email-rules-shared";

describe("renderEmailTemplate", () => {
  it("{{변수}}를 값으로 채운다", () => {
    const result = renderEmailTemplate("{{이름}}님, 안녕하세요.", {
      이름: "김철수",
    });
    expect(result).toBe("김철수님, 안녕하세요.");
  });

  it("같은 변수가 여러 번 나와도 전부 채운다", () => {
    const result = renderEmailTemplate("{{이름}} {{이름}}", { 이름: "김" });
    expect(result).toBe("김 김");
  });

  it("변수 이름 앞뒤 공백은 무시한다", () => {
    const result = renderEmailTemplate("{{ 이름 }}", { 이름: "김철수" });
    expect(result).toBe("김철수");
  });

  it("모르는 변수(오타 등)는 그대로 남겨서 눈에 띄게 한다", () => {
    const result = renderEmailTemplate("{{오타변수}}", { 이름: "김철수" });
    expect(result).toBe("{{오타변수}}");
  });

  it("값이 빈 문자열이면 빈 문자열로 채운다(변수 자체는 사라짐)", () => {
    const result = renderEmailTemplate("계좌: {{계좌}}", { 계좌: "" });
    expect(result).toBe("계좌: ");
  });
});

describe("이메일 규칙 변수·트리거 목록 일관성", () => {
  it("모든 공용 변수에 미리보기 값이 있다", () => {
    for (const { key } of EMAIL_VARIABLES) {
      expect(EMAIL_VARIABLE_PREVIEW_VALUES[key]).toBeDefined();
    }
  });

  it("촬영 며칠 전/후 트리거만 day_offset이 필요한 트리거 집합에 들어있다", () => {
    expect(DAY_OFFSET_TRIGGER_TYPES.has("days_before_shoot")).toBe(true);
    expect(DAY_OFFSET_TRIGGER_TYPES.has("days_after_shoot")).toBe(true);
    expect(DAY_OFFSET_TRIGGER_TYPES.has("on_requested")).toBe(false);
  });

  it("트리거·수신자 목록이 비어있지 않다", () => {
    expect(EMAIL_TRIGGER_TYPES.length).toBeGreaterThan(0);
    expect(EMAIL_RECIPIENTS.length).toBe(2);
  });
});
