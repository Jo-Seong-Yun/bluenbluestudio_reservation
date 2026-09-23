import { describe, expect, it } from "vitest";
import {
  finalizeEmailHtml,
  htmlToPlainText,
  isEmptyEmailBody,
  isHtmlBody,
  plainTextToHtml,
  renderEmailHtml,
  toEditorHtml,
} from "./email-html";

describe("이메일 HTML 본문", () => {
  it("에디터 HTML과 옛 평문 본문을 구분한다", () => {
    expect(isHtmlBody("<p>안녕하세요</p>")).toBe(true);
    expect(isHtmlBody("{{이름}}님, 안녕하세요.\n예약번호: 1")).toBe(false);
    expect(isHtmlBody("가격 < 10000원")).toBe(false);
  });

  it("옛 평문 본문은 한 줄 = 한 문단으로 바꾸고 특수문자를 이스케이프한다", () => {
    expect(plainTextToHtml("첫 줄\n\n<둘째>")).toBe(
      "<p>첫 줄</p><p></p><p>&lt;둘째&gt;</p>",
    );
    expect(toEditorHtml("<p>그대로</p>")).toBe("<p>그대로</p>");
  });

  it("변수 값은 이스케이프하고 여러 줄 값은 <br>로 바꾼다", () => {
    const html = renderEmailHtml("<p>{{이름}}님 / {{후보목록}} / {{오타}}</p>", {
      이름: "<김>&",
      후보목록: "1지망\n2지망",
    });
    expect(html).toBe("<p>&lt;김&gt;&amp;님 / 1지망<br>2지망 / {{오타}}</p>");
  });

  it("평문 규칙도 발송 전에 HTML로 바뀌어 변수가 채워진다", () => {
    expect(renderEmailHtml("{{이름}}님\n감사합니다", { 이름: "김철수" })).toBe(
      "<p>김철수님</p><p>감사합니다</p>",
    );
  });

  it("발송용 HTML은 스크립트를 걸러내고 빈 문단에 줄바꿈을 넣는다", () => {
    const html = finalizeEmailHtml(
      '<p>안녕</p><p></p><script>alert(1)</script><img src="https://x.test/a.png">',
    );
    expect(html).not.toContain("<script");
    expect(html).toContain("<p><br></p>");
    expect(html).toContain('style="max-width:100%;height:auto"');
  });

  it("평문 대체본은 문단·줄바꿈을 살리고 엔티티를 되돌린다", () => {
    expect(htmlToPlainText("<p>A &amp; B</p><p>줄1<br>줄2</p><ul><li>x</li></ul>")).toBe(
      "A & B\n줄1\n줄2\n- x",
    );
  });

  it("글자도 이미지도 없는 에디터 본문은 빈 본문으로 본다", () => {
    expect(isEmptyEmailBody("<p></p>")).toBe(true);
    expect(isEmptyEmailBody("")).toBe(true);
    expect(isEmptyEmailBody('<p><img src="https://x.test/a.png"></p>')).toBe(false);
    expect(isEmptyEmailBody("<p>내용</p>")).toBe(false);
  });
});
