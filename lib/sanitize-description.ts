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
// 아래는 이메일 규칙의 "요약 박스"(선 없는 표) 삽입 기능이 셀마다
// 만들어 넣는 인라인 style을 그대로 통과시키기 위한 값들이다 — 관리자가
// 직접 타이핑하는 임의 CSS가 아니라 우리 코드가 생성하는 값이라도,
// 사이니타이저는 태그별 허용 목록으로만 판단하므로 여기 등록해야 한다.
const ALLOWED_CELL_WIDTH = /^\d{1,3}px$/;
const ALLOWED_PADDING = /^\d{1,3}px(?: \d{1,3}px){0,3}$/;
const ALLOWED_FONT_WEIGHT = /^(?:400|500|600|700|bold|normal)$/;
const ALLOWED_WHITE_SPACE = /^nowrap$/;
const ALLOWED_VERTICAL_ALIGN = /^(?:top|middle|bottom)$/;
const ALLOWED_BORDER_NONE = /^none$/;
// 에디터에 넣은 표를 브라우저가 DOM으로 한 번 왕복시키면 style의 색상이
// #hex에서 rgb(...)로 정규화되므로, 저장 직후(hex)와 에디터를 다시 연
// 뒤(rgb) 양쪽 다 통과하도록 둘 다 허용한다.
const ALLOWED_BORDER_SIDE = new RegExp(
  `^1px solid (?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\))$`,
);
const ALLOWED_RADIUS = /^\d{1,2}px$/;

const BLOCK_STYLES = {
  "text-align": [ALLOWED_ALIGN],
  "line-height": [ALLOWED_LINE_HEIGHT],
  "padding-top": [ALLOWED_PARAGRAPH_SPACE],
  "padding-bottom": [ALLOWED_PARAGRAPH_SPACE],
  "margin-left": [ALLOWED_INDENT],
};

const TABLE_CELL_STYLES = {
  "text-align": [ALLOWED_ALIGN],
  "background-color": [ALLOWED_COLOR],
  width: [ALLOWED_CELL_WIDTH],
  padding: [ALLOWED_PADDING],
  "font-size": [ALLOWED_FONT_SIZE],
  "font-weight": [ALLOWED_FONT_WEIGHT],
  color: [ALLOWED_COLOR],
  "white-space": [ALLOWED_WHITE_SPACE],
  "vertical-align": [ALLOWED_VERTICAL_ALIGN],
  border: [ALLOWED_BORDER_NONE, ALLOWED_BORDER_SIDE],
  "border-top": [ALLOWED_BORDER_NONE, ALLOWED_BORDER_SIDE],
  "border-bottom": [ALLOWED_BORDER_NONE, ALLOWED_BORDER_SIDE],
  "border-left": [ALLOWED_BORDER_NONE, ALLOWED_BORDER_SIDE],
  "border-right": [ALLOWED_BORDER_NONE, ALLOWED_BORDER_SIDE],
  "border-top-left-radius": [ALLOWED_RADIUS],
  "border-top-right-radius": [ALLOWED_RADIUS],
  "border-bottom-left-radius": [ALLOWED_RADIUS],
  "border-bottom-right-radius": [ALLOWED_RADIUS],
};

export function sanitizeDescriptionHtml(
  html: string,
  exclusiveFilter?: sanitizeHtml.IOptions["exclusiveFilter"],
): string {
  return sanitizeHtml(html, {
    exclusiveFilter,
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "strong",
      "em",
      "s",
      "u",
      "sub",
      "sup",
      "mark",
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
      "table",
      "colgroup",
      "col",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "label",
      "input",
      "div",
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
      th: TABLE_CELL_STYLES,
      td: TABLE_CELL_STYLES,
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
