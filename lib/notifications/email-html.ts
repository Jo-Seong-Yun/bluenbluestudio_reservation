import { sanitizeDescriptionHtml } from "../sanitize-description";

/**
 * 이메일 본문은 상품 상세 설명과 같은 서식 에디터로 쓰므로 HTML로
 * 저장·발송한다. 서식 에디터 도입 전에 만든 규칙은 본문이 줄바꿈만 있는
 * 평문이라, 에디터에 열거나 보낼 때 여기서 HTML로 바꿔 쓴다 — 관리자가
 * 한 번 다시 저장하면 그때부터 HTML로 저장된다.
 *
 * 서버(발송)와 클라이언트(미리보기) 양쪽에서 쓰는 순수 함수만 둔다.
 */

const HTML_TAG = /<\/?(?:p|br|h[1-6]|ul|ol|li|strong|em|s|a|img|span|div|blockquote|hr|pre|code)\b[^>]*>/i;

export function isHtmlBody(body: string): boolean {
  return HTML_TAG.test(body);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 평문(줄바꿈)을 한 줄 = 한 문단으로 바꾼다. 빈 줄은 빈 문단이 된다. */
export function plainTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<p></p>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
}

/** 에디터에 넣을 본문 — 옛 평문 본문이면 HTML로 바꿔준다. */
export function toEditorHtml(body: string): string {
  return isHtmlBody(body) ? body : plainTextToHtml(body);
}

/**
 * HTML 본문의 {{변수}}를 값으로 채운다. 값(손님 이름 등)은 HTML로
 * 해석되지 않게 이스케이프하고, 여러 줄 값(후보목록 등)은 <br>로 줄을
 * 바꾼다. 모르는 변수는 renderEmailTemplate처럼 그대로 남긴다.
 */
export function renderEmailHtml(
  body: string,
  variables: Record<string, string>,
): string {
  return toEditorHtml(body).replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (match, key: string) =>
      key in variables ? escapeHtml(variables[key]).replace(/\n/g, "<br>") : match,
  );
}

/**
 * 실제 발송용 HTML. 에디터가 만든 빈 문단(<p></p>)은 메일 앱에서 높이
 * 0으로 접혀 줄 간격이 사라지니 <br>을 넣고, 이미지는 화면 폭을 넘지
 * 않게 한다. 메일 앱은 사이트 CSS를 못 쓰니 필요한 서식은 인라인으로 준다.
 */
export function finalizeEmailHtml(html: string): string {
  const safe = sanitizeDescriptionHtml(html)
    .replace(/<p([^>]*)><\/p>/g, "<p$1><br></p>")
    .replace(/<img /g, '<img style="max-width:100%;height:auto" ');
  return (
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif;' +
    'font-size:15px;line-height:1.6;color:#111">' +
    safe +
    "</div>"
  );
}

/** HTML을 못 여는 메일 앱용 평문 대체본. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 글자도 이미지도 없는 본문(에디터의 빈 "<p></p>" 등)인지. */
export function isEmptyEmailBody(body: string): boolean {
  return htmlToPlainText(toEditorHtml(body)) === "" && !/<img\b/i.test(body);
}
