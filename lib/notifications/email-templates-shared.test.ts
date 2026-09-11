import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_PURPOSES,
  EMAIL_TEMPLATE_PREVIEW_VALUES,
  EMAIL_TEMPLATE_VARIABLES,
  renderEmailTemplate,
} from "./email-templates-shared";

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

describe("이메일 템플릿 기본값·변수 목록 일관성", () => {
  it("모든 목적에 기본 제목/본문이 있다", () => {
    for (const purpose of EMAIL_TEMPLATE_PURPOSES) {
      expect(DEFAULT_EMAIL_TEMPLATES[purpose].subject).toBeTruthy();
      expect(DEFAULT_EMAIL_TEMPLATES[purpose].body).toBeTruthy();
    }
  });

  it("기본 본문에 쓰인 {{변수}}는 전부 EMAIL_TEMPLATE_VARIABLES에 등록돼 있다", () => {
    for (const purpose of EMAIL_TEMPLATE_PURPOSES) {
      const body = DEFAULT_EMAIL_TEMPLATES[purpose].body;
      const used = [...body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(
        (m) => m[1],
      );
      const known = EMAIL_TEMPLATE_VARIABLES[purpose].map((v) => v.key);
      for (const key of used) {
        expect(known).toContain(key);
      }
    }
  });

  it("미리보기 예시 값이 모든 변수를 채워준다", () => {
    for (const purpose of EMAIL_TEMPLATE_PURPOSES) {
      const preview = EMAIL_TEMPLATE_PREVIEW_VALUES[purpose];
      for (const { key } of EMAIL_TEMPLATE_VARIABLES[purpose]) {
        expect(preview[key]).toBeDefined();
      }
    }
  });

  it("기본 문구를 미리보기 값으로 렌더링하면 남는 {{}}가 없다", () => {
    for (const purpose of EMAIL_TEMPLATE_PURPOSES) {
      const rendered = renderEmailTemplate(
        DEFAULT_EMAIL_TEMPLATES[purpose].body,
        EMAIL_TEMPLATE_PREVIEW_VALUES[purpose],
      );
      expect(rendered).not.toContain("{{");
    }
  });
});
