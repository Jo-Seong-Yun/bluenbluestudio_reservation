import { describe, expect, it } from "vitest";
import { sanitizeDescriptionHtml } from "./sanitize-description";

describe("sanitizeDescriptionHtml", () => {
  it("허용된 태그와 안전한 색상은 그대로 둔다", () => {
    const input =
      '<h2>제목</h2><p><strong>굵게</strong> <span style="color: #ff0000">빨강</span></p>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).toContain("<h2>제목</h2>");
    expect(output).toContain("<strong>굵게</strong>");
    expect(output).toContain('style="color:#ff0000"');
    expect(output).toContain("빨강");
  });

  it("script 태그와 이벤트 핸들러 속성을 제거한다", () => {
    const input = '<p onclick="alert(1)">안녕</p><script>alert(1)</script>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).not.toContain("<script");
    expect(output).not.toContain("onclick");
    expect(output).toContain("안녕");
  });

  it("javascript: 링크를 제거한다", () => {
    const input = '<a href="javascript:alert(1)">클릭</a>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).not.toContain("javascript:");
  });

  it("color 외의 style 속성은 허용하지 않는다", () => {
    const input =
      '<span style="color: #ff0000; background: url(javascript:alert(1))">x</span>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).toContain("color:#ff0000");
    expect(output).not.toContain("background");
  });

  it("img의 src/alt는 허용한다", () => {
    const input = '<img src="https://example.com/a.jpg" alt="설명">';
    const output = sanitizeDescriptionHtml(input);
    expect(output).toContain('src="https://example.com/a.jpg"');
    expect(output).toContain('alt="설명"');
  });

  it("Tiptap 색상 확장이 내보내는 rgb() 형식도 허용한다", () => {
    const input = '<span style="color: rgb(255, 0, 0);">빨강</span>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).toContain("rgb(255, 0, 0)");
  });

  it("링크에는 rel과 target을 붙인다", () => {
    const input = '<a href="https://example.com">링크</a>';
    const output = sanitizeDescriptionHtml(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain("noopener");
  });
});
