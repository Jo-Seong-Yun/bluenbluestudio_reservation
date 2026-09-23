/**
 * 문항 "상세 설명"(field.description) 렌더링.
 *
 * 새 에디터(field-description-editor.tsx)는 상품 상세 설명·이메일과 같은
 * 서식 에디터라, 제목·목록·표·이미지·색까지 담긴 HTML로 저장한다
 * (app/admin/actions.ts에서 저장 전에 정화한다). 이전엔 그냥 줄글
 * 텍스트로 저장돼 있었으므로, 태그가 안 보이면 옛 데이터로 보고 줄바꿈만
 * 살려서 보여준다.
 */
const fieldProseClass =
  "block [&_a]:text-brand [&_a]:underline [&_p]:mt-1 [&_p:first-child]:mt-0 " +
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through " +
  "[&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-bold " +
  "[&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:ml-1 " +
  "[&_img]:my-1 [&_img]:max-w-full [&_img]:rounded " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 " +
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ml-0 " +
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:list-none " +
  "[&_ul[data-type=taskList]_li]:ml-0 [&_ul[data-type=taskList]_li]:gap-1.5 " +
  "[&_table]:border-collapse [&_table]:my-1 " +
  "[&_td]:border [&_td]:border-border [&_td]:px-1.5 [&_td]:py-1 " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface-subtle [&_th]:px-1.5 [&_th]:py-1";

export function FieldDescription({ html }: { html: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);

  if (looksLikeHtml) {
    return (
      <span
        className={fieldProseClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span className="whitespace-pre-line">{html}</span>;
}
