"use client";

import { RichTextEditor } from "@/components/rich-text-editor";

/**
 * 상세 설명 전용 에디터. 지금 보이는 그대로가 손님에게 보이는 모습인
 * 위지윅(WYSIWYG) 편집을 한다. 저장 형식은 마크다운이 아니라 HTML이다
 * — 글자색이나 이미지처럼 마크다운으로는 표현할 수 없는 서식을 쓰려면
 * HTML이 필요하다. 손님 화면(components/rich-text.tsx)에서 저장 전과
 * 똑같이 한 번 더 정화(sanitize)해서 보여준다. 에디터 본체는 이메일
 * 본문 편집과 같은 components/rich-text-editor.tsx를 쓴다.
 *
 * 이 에디터 자체는 저장 버튼이 없다 — 예전엔 여기서 따로 저장했는데,
 * 상품 기본정보 폼의 "저장"과 서로 다른 폼이라 기본정보만 저장하고
 * 나가면 방금 고친 설명이 반영 안 되는 문제가 있었다. 지금은 바뀐
 * HTML을 onChange로 위(ProductEditorPanel)에 그대로 올려보내고,
 * 그쪽이 기본정보 폼의 숨은 입력값으로 실어서 한 번에 같이 저장한다.
 */
export function DescriptionEditor({
  initial,
  onChange,
  onClose,
}: {
  initial: string;
  /** 바뀐 HTML을 매번 올려보낸다(상품 기본정보 폼에 같이 실어 저장하기 위해). */
  onChange: (html: string) => void;
  /** 있으면 헤더에 닫기(×) 버튼이 뜬다. 상시 노출되는 화면에서는 안 준다. */
  onClose?: () => void;
}) {
  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">상세 설명</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        ) : null}
      </div>

      <RichTextEditor
        initial={initial}
        onChange={onChange}
        placeholder="이런 분께 추천합니다, 포함 사항 등을 자유롭게 작성해 주십시오."
      />
    </div>
  );
}
