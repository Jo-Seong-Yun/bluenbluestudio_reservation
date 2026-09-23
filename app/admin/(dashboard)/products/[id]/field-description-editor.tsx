"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";

/**
 * 문항 "상세 설명" 편집기. 상품 상세 설명·이메일 본문과 똑같은 서식
 * 에디터(RichTextEditor)를 쓴다 — 문항 아래 작게 뜨는 보조 설명이지만,
 * 사이트의 모든 편집기를 같은 도구로 통일한다.
 *
 * 폼 제출은 이 컴포넌트가 아니라 감싸는 <form>이 하므로, 결과 HTML은
 * 숨은 input에 담아 일반 필드처럼 넘긴다. 저장 전 정화는
 * app/admin/actions.ts(sanitizeDescriptionHtml)에서 한다.
 */
export function FieldDescriptionEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  return (
    <div>
      <RichTextEditor
        initial={defaultValue}
        onChange={setHtml}
        heightClass="h-[180px]"
        placeholder="질문 아래 작게 표시할 설명을 입력해 주십시오."
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
