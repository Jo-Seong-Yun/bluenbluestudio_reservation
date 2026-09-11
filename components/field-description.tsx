/**
 * 문항 "상세 설명"(field.description) 렌더링.
 *
 * 새 에디터(field-description-editor.tsx)는 굵게/기울임/줄바꿈이 담긴
 * HTML로 저장한다(app/admin/actions.ts에서 저장 전에 정화한다). 이전엔
 * 그냥 줄글 텍스트로 저장돼 있었으므로, 태그가 안 보이면 옛 데이터로
 * 보고 줄바꿈만 살려서 보여준다 — 문항 아래 작게 뜨는 보조 설명이라
 * 마크다운까지 해석할 필요는 없다(components/rich-text.tsx와 달리).
 */
export function FieldDescription({ html }: { html: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);

  if (looksLikeHtml) {
    return (
      <span
        className="[&_p]:mt-1 [&_p:first-child]:mt-0 [&_strong]:font-bold [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span className="whitespace-pre-line">{html}</span>;
}
