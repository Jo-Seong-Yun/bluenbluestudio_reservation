import sanitizeHtml from "sanitize-html";

/**
 * 상품 상세 설명(WYSIWYG 에디터 결과물)을 안전하게 만든다.
 *
 * 저장할 때(admin 액션)와 손님 화면에 보여줄 때 모두 이 함수를 거친다.
 * 관리자만 쓸 수 있는 화면이라도 계정이 뚫리면 손님 화면에 스크립트를
 * 심을 수 있으니, 허용 목록에 없는 태그·속성은 전부 걸러낸다. 색상은
 * style="color: ..." 형태만 허용하고 값도 정규식으로 검증한다(문단은
 * 정렬·행간격·단락 앞/뒤 공백만).
 */
const ALLOWED_COLOR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
const ALLOWED_ALIGN = /^(?:left|center|right|justify)$/;
// 행간격(1~3)과 단락 앞/뒤 공백 — 에디터의 ParagraphSpacing 확장
// (components/tiptap/paragraph-spacing.ts)이 만드는 값만 통과시킨다.
const ALLOWED_LINE_HEIGHT = /^(?:[12](?:\.\d{1,2})?|3(?:\.0{1,2})?)$/;
const ALLOWED_PARAGRAPH_SPACE = /^0\.75em$/;
const BLOCK_STYLES = {
  "text-align": [ALLOWED_ALIGN],
  "line-height": [ALLOWED_LINE_HEIGHT],
  "padding-top": [ALLOWED_PARAGRAPH_SPACE],
  "padding-bottom": [ALLOWED_PARAGRAPH_SPACE],
};

export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "strong",
      "em",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
      "code",
      "pre",
      "span",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width"],
      span: ["style"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
    },
    allowedStyles: {
      span: { color: [ALLOWED_COLOR] },
      p: BLOCK_STYLES,
      h2: BLOCK_STYLES,
      h3: BLOCK_STYLES,
    },
    allowedSchemes: ["http", "https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
  });
}
