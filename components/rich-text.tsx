import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description";

// break-words(overflow-wrap: break-word) — 공백이나 한글 글자 사이가 아니라
// 띄어쓰기 없는 긴 영문·URL처럼 줄바꿈 지점이 아예 없는 글자는 기본적으로
// 브라우저가 줄을 못 바꾸고 그대로 칸 밖으로(옆 달력 뒤로) 흘려보낸다 —
// 실제로 이 클래스 없이 렌더링해보면 재현된다. break-words를 주면 그런
// 경우에만(정상적인 줄바꿈으로 충분하면 그대로 두고) 강제로 끊어준다.
// 에디터(Tiptap)에서 빈 줄만 남기고 Enter를 두 번 치면 내용이 하나도
// 없는 <p></p>가 그대로 저장된다 — 편집 중엔 브라우저가 그 자리에
// 커서용 <br>을 보여줘 빈 줄처럼 보이지만, 저장된 HTML엔 그 <br>이
// 없어서 완전히 빈 블록이 된다. 완전히 빈 블록은 줄 높이를 가질
// 내용이 없어 브라우저가 0px로 접어버려, 손님 화면에서는 분명히
// 띄어 썼던 줄 간격이 사라져 보였다. 빈 <p>에만 최소 높이를 줘서
// 빈 줄도 한 줄만큼의 자리를 그대로 차지하게 한다.
const proseClass =
  "[&_a]:text-brand space-y-3 leading-relaxed break-words [&_a]:underline " +
  "[&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold " +
  "[&_li]:ml-5 [&_li]:list-disc [&_strong]:font-bold [&_img]:my-3 " +
  "[&_img]:max-w-full [&_img]:rounded-lg [&_p:empty]:min-h-[1em]";

/**
 * 상품 설명 렌더링. 관리자 미리보기 없이 위지윅으로 편집하니, 에디터가
 * 저장하는 형식(HTML)을 그대로 정화(sanitize)해서 보여준다.
 *
 * 옛날에 마크다운 텍스트 에디터로 저장된 설명(예: "## 제목")도 있을 수
 * 있어, HTML 태그가 안 보이면 마크다운으로 간주해 예전 방식대로
 * 렌더링한다 — 관리자가 그 상품을 한 번 다시 저장하면 그때부터 HTML로
 * 바뀐다.
 */
export function RichText({ children }: { children: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(children);

  if (looksLikeHtml) {
    return (
      <div
        className={proseClass}
        dangerouslySetInnerHTML={{
          __html: sanitizeDescriptionHtml(children),
        }}
      />
    );
  }

  return (
    <div className={proseClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
