"use client";

import { useActionState, useRef, useState } from "react";
import {
  saveProductDescription,
  type ProductDescriptionState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { Markdown } from "@/components/markdown";

/**
 * 상세 설명 전용 에디터. 마크다운을 그대로 저장하지만(손님 화면이
 * react-markdown으로 렌더링하니 형식을 바꿀 이유가 없다), 사장님이
 * 문법을 직접 외우지 않아도 되도록 굵게·제목·목록·링크 버튼을 둔다.
 * 버튼은 지금 커서 위치나 선택 영역에 그 문법을 끼워 넣고, 커서를
 * 그 자리에 그대로 둔다.
 */
export function DescriptionEditor({
  productId,
  initial,
}: {
  productId: string;
  initial: string;
}) {
  const [state, action, pending] = useActionState<
    ProductDescriptionState,
    FormData
  >(saveProductDescription, null);
  const [description, setDescription] = useState(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string = before) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart) +
      before +
      selected +
      after +
      value.slice(selectionEnd);
    setDescription(next);

    const cursorStart = selectionStart + before.length;
    const cursorEnd = cursorStart + selected.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function prefixLine(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, value } = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setDescription(next);

    const cursor = selectionStart + prefix.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function insertLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || "링크 텍스트";
    const insertion = `[${selected}](https://)`;
    const next =
      value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    setDescription(next);

    // 주소 부분을 선택 상태로 둬서 바로 이어서 입력할 수 있게 한다.
    const urlStart = selectionStart + selected.length + 3;
    const urlEnd = urlStart + "https://".length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(urlStart, urlEnd);
    });
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={productId} />

      <div>
        <div className="border-border bg-surface-subtle flex flex-wrap gap-1 rounded-t-lg border border-b-0 p-2">
          <ToolbarButton onClick={() => prefixLine("## ")} title="제목">
            제목
          </ToolbarButton>
          <ToolbarButton onClick={() => wrapSelection("**")} title="굵게">
            <b>굵게</b>
          </ToolbarButton>
          <ToolbarButton onClick={() => wrapSelection("*")} title="기울임">
            <i>기울임</i>
          </ToolbarButton>
          <ToolbarButton onClick={() => prefixLine("- ")} title="목록">
            목록
          </ToolbarButton>
          <ToolbarButton onClick={insertLink} title="링크">
            링크
          </ToolbarButton>
        </div>
        <textarea
          ref={textareaRef}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={18}
          placeholder={
            "## 이런 분께 추천해요\n\n- 이력서용 사진이 필요한 분\n\n## 포함 사항\n\n- 촬영 60분\n- 보정본 5장"
          }
          className={`${inputClass} resize-y rounded-t-none font-mono text-sm`}
        />
      </div>

      <div className="border-border bg-surface min-h-40 rounded-lg border px-4 py-3">
        <p className="text-muted mb-2 text-xs">손님에게 보이는 모습</p>
        {description.trim() ? (
          <Markdown>{description}</Markdown>
        ) : (
          <p className="text-muted text-sm">위에서 입력하면 여기 보여요.</p>
        )}
      </div>

      <ErrorText>{state?.error}</ErrorText>
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          저장했어요.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="border-border bg-surface hover:bg-surface-subtle rounded border px-2.5 py-1 text-xs"
    >
      {children}
    </button>
  );
}
