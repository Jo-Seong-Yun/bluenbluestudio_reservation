import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 상품 설명 렌더링.
 *
 * 관리자 미리보기와 손님 화면이 같은 컴포넌트를 쓴다. 그래야
 * "쓸 때 본 모습"과 "손님이 보는 모습"이 어긋나지 않는다.
 *
 * react-markdown은 기본적으로 원본 HTML을 실행하지 않는다.
 * (rehype-raw 같은 플러그인을 넣지 않는 한) 그대로 두는 게 안전하다.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="[&_a]:text-brand space-y-3 leading-relaxed [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-bold">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
