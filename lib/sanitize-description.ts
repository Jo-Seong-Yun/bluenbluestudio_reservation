import sanitizeHtml from "sanitize-html";

/**
 * 상품 상세 설명(WYSIWYG 에디터 결과물)을 안전하게 만든다.
 *
 * 저장할 때(admin 액션)와 손님 화면에 보여줄 때 모두 이 함수를 거친다.
 * 관리자만 쓸 수 있는 화면이라도 계정이 뚫리면 손님 화면에 스크립트를
 * 심을 수 있으니, 허용 목록에 없는 태그·속성은 전부 걸러낸다. 색상은
 * style="color: ..." 형태만 허용하고 값도 정규식으로 검증한다.
 */
const ALLOWED_COLOR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;

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
    },
    allowedStyles: {
      span: { color: [ALLOWED_COLOR] },
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
