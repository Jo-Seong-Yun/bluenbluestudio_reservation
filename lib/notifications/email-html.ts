import { sanitizeDescriptionHtml } from "../sanitize-description";
import { SITE } from "../site";

/** 메일 본문 공통 글꼴 — 한글이 잘 보이는 순으로. */
const EMAIL_FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',Roboto,sans-serif";

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

type EmailShellOptions = {
  ctaText?: string | null;
  ctaUrl?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

const SAFE_HEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_URL = /^https?:\/\//;

/**
 * 실제 발송용 HTML. 에디터가 만든 빈 문단(<p></p>)은 메일 앱에서 높이
 * 0으로 접혀 줄 간격이 사라지니 <br>을 넣고, 이미지는 화면 폭을 넘지
 * 않게 한다. 메일 앱은 사이트 CSS를 못 쓰니 필요한 서식은 인라인으로 준다.
 */
export function finalizeEmailHtml(html: string, options?: EmailShellOptions): string {
  // 메일 앱은 사이트 CSS(class)를 못 쓰니 표·인용 같은 블록 서식은
  // 인라인 style로 직접 준다. 편집기·손님 화면은 class로 처리한다.
  const safe = sanitizeDescriptionHtml(html)
    .replace(/<p([^>]*)><\/p>/g, "<p$1><br></p>")
    .replace(/<img /g, '<img style="max-width:100%;height:auto" ')
    .replace(/<table/g, '<table style="border-collapse:collapse;margin:12px 0"')
    // style이 없는 셀에만 테두리를 넣는다(정렬 등 style이 이미 있는 셀은
    // 속성이 겹치지 않게 그대로 둔다).
    .replace(
      /<(td|th)((?:(?!style=)[^>])*?)>/g,
      '<$1$2 style="border:1px solid #d1d5db;padding:6px 8px">',
    )
    .replace(
      /<blockquote/g,
      '<blockquote style="border-left:3px solid #d1d5db;margin:8px 0;padding-left:12px;color:#555"',
    );

  let ctaBlock = "";
  if (
    options?.ctaText &&
    options?.ctaUrl &&
    SAFE_URL.test(options.ctaUrl)
  ) {
    const btnColor =
      options.brandColor && SAFE_HEX.test(options.brandColor)
        ? options.brandColor
        : "#111827";
    ctaBlock =
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;">` +
      `<tr><td align="center">` +
      `<a href="${escapeHtml(options.ctaUrl)}" target="_blank" style="display:inline-block;background-color:${btnColor};color:#ffffff;font-family:${EMAIL_FONT_STACK};padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;line-height:1;">${escapeHtml(options.ctaText)}</a>` +
      `</td></tr></table>`;
  }

  const body =
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:15px;line-height:1.7;color:#1f2937">` +
    safe +
    ctaBlock +
    "</div>";
  return wrapInEmailShell(body, options);
}

/**
 * 본문을 "제대로 된 메일" 모양으로 감싼다. 그냥 <div>만 보내면 메일 앱이
 * 화면 끝까지 꽉 차게 붙여 보여줘 어색한데, 회색 배경 위에 가운데 정렬된
 * 흰색 카드(가로 최대 600px)에 담고 위에 스튜디오 이름, 아래에 안내
 * 문구를 넣어 흔히 보는 안내 메일처럼 보이게 한다. 구형 메일 앱(아웃룩
 * 등)도 깨지지 않게 table 기반으로 짜고 서식은 전부 인라인으로 준다.
 */
function wrapInEmailShell(content: string, options?: EmailShellOptions): string {
  const headerContent =
    options?.logoUrl && SAFE_URL.test(options.logoUrl)
      ? `<img src="${escapeHtml(options.logoUrl)}" alt="${escapeHtml(SITE.name)}" style="height:40px;max-width:200px;display:block;">`
      : `<span style="font-size:17px;font-weight:700;color:#111827;letter-spacing:-0.01em;">${SITE.name}</span>`;
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #eef1f4;font-family:${EMAIL_FONT_STACK};">
${headerContent}
</td></tr>
<tr><td style="padding:28px;">${content}</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid #eef1f4;font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:1.6;color:#9ca3af;">
${SITE.name} · ${SITE.nameEn}<br>본 메일은 예약 안내를 위해 발송되었습니다.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
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
