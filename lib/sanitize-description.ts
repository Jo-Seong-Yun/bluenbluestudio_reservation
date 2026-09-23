import sanitizeHtml from "sanitize-html";
import { FONT_FAMILY_STYLE_REGEX } from "../components/tiptap/formatting";

/**
 * 서식 에디터(상품 상세 설명·이메일 본문)의 결과물을 안전하게 만든다.
 *
 * 저장할 때(admin 액션)와 손님 화면·메일에 보여줄 때 모두 이 함수를
 * 거친다. 관리자만 쓰는 화면이라도 계정이 뚫리면 스크립트를 심을 수
 * 있으니, 허용 목록에 없는 태그·속성·스타일은 전부 걸러낸다. 색·정렬·
 * 행간격·글꼴·크기 같은 style 값도 정규식/허용목록으로 검증한다.
 */
const ALLOWED_COLOR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
const ALLOWED_ALIGN = /^(?:left|center|right|justify)$/;
// 행간격(1~3)과 단락 앞/뒤 공백·들여쓰기 — 에디터의 ParagraphSpacing
// 확장(components/tiptap/paragraph-spacing.ts)이 만드는 값만 통과시킨다.
const ALLOWED_LINE_HEIGHT = /^(?:[12](?:\.\d{1,2})?|3(?:\.0{1,2})?)$/;
const ALLOWED_PARAGRAPH_SPACE = /^0\.75em$/;
const ALLOWED_INDENT = /^(?:[2-9]|1[0-6])em$/; // 2em 단위, 최대 16em(8단계)
const ALLOWED_FONT_SIZE = /^(?:[89]|[1-9]\d)px$/; // 8~99px
const ALLOWED_FONT_FAMILY = FONT_FAMILY_STYLE_REGEX;
const ALLOWED_COLWIDTH = /^\d{1,4}px$/;

const BLOCK_STYLES = {
  "text-align": [ALLOWED_ALIGN],
  "line-height": [ALLOWED_LINE_HEIGHT],
  "padding-top": [ALLOWED_PARAGRAPH_SPACE],
  "padding-bottom": [ALLOWED_PARAGRAPH_SPACE],
  "margin-left": [ALLOWED_INDENT],
};

export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h2", "h3", "strong", "em", "s", "u", "sub", "sup", "mark",
      "a", "ul", "ol", "li", "blockquote", "hr", "code", "pre", "span", "img",
      "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
      "label", "input", "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width"],
      span: ["style"],
      mark: ["style", "data-color"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      ul: ["data-type"],
      li: ["data-type", "data-checked"],
      input: ["type", "checked", "disabled"],
      col: ["style"],
      th: ["colspan", "rowspan", "colwidth", "style"],
      td: ["colspan", "rowspan", "colwidth", "style"],
    },
    allowedStyles: {
      span: {
        color: [ALLOWED_COLOR],
        "background-color": [ALLOWED_COLOR],
        "font-size": [ALLOWED_FONT_SIZE],
        "font-family": [ALLOWED_FONT_FAMILY],
      },
      mark: { "background-color": [ALLOWED_COLOR] },
      p: BLOCK_STYLES,
      h2: BLOCK_STYLES,
      h3: BLOCK_STYLES,
      col: { "min-width": [ALLOWED_COLWIDTH], width: [ALLOWED_COLWIDTH] },
      th: { "text-align": [ALLOWED_ALIGN], "background-color": [ALLOWED_COLOR] },
      td: { "text-align": [ALLOWED_ALIGN], "background-color": [ALLOWED_COLOR] },
    },
    allowedSchemes: ["http", "https"],
    // 체크리스트 체크박스는 손님 화면·메일에서 눌러도 상태가 바뀌면 안
    // 되니(저장 기능이 아니라 서식일 뿐) 항상 읽기전용으로 고정한다.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
      input: sanitizeHtml.simpleTransform("input", { disabled: "disabled" }),
    },
  });
}
