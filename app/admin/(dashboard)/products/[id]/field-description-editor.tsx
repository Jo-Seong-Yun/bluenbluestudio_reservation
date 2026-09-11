"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic } from "lucide-react";

const editorContentClass =
  "min-h-[4.5rem] rounded-b-lg border border-t-0 border-border bg-surface " +
  "px-3 py-2 text-sm outline-none focus:border-brand [&_p]:my-0 " +
  "[&_strong]:font-bold [&_em]:italic";

/**
 * 문항 "상세 설명" 전용 초소형 에디터. 상품 상세 설명(description-editor.tsx)과
 * 달리 문항 아래 작게 뜨는 보조 설명이라 제목·목록·이미지·링크·글자색까지는
 * 과하다 — 굵게/기울임/줄바꿈(Enter로 새 문단)만 지원한다.
 *
 * 폼 제출은 이 컴포넌트가 아니라 감싸는 <form>이 하므로, 결과 HTML은
 * 숨은 input에 담아 일반 필드처럼 넘긴다(상품 설명 에디터와 같은 방식).
 */
export function FieldDescriptionEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: "질문 아래 작게 표시할 설명을 입력해 주십시오.",
      }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: { class: editorContentClass },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
    }),
  });

  return (
    <div>
      <div className="border-border bg-surface-subtle flex items-center gap-1 rounded-t-lg border p-1.5">
        <ToolbarButton
          active={editorState?.bold}
          title="굵게"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editorState?.italic}
          title="기울임"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded ${
        active ? "bg-brand text-brand-foreground" : "text-muted hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
