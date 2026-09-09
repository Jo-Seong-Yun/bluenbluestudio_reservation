import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description";

const proseClass =
  "[&_a]:text-brand space-y-3 leading-relaxed [&_a]:underline [&_h2]:mt-6 " +
  "[&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold [&_li]:ml-5 " +
  "[&_li]:list-disc [&_strong]:font-bold [&_img]:my-3 [&_img]:max-w-full " +
  "[&_img]:rounded-lg";

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
