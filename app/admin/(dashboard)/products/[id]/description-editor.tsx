"use client";

import { useActionState, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import {
  saveProductDescription,
  type ProductDescriptionState,
} from "@/app/admin/actions";
import { Button, ErrorText } from "@/components/ui";

// tiptap-markdown은 editor.storage.markdown을 런타임에 채워주지만
// @tiptap/core의 Storage 타입은 그 확장을 모르니 직접 알려준다.
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

const editorContentClass =
  "min-h-[380px] rounded-b-lg border border-t-0 border-border bg-surface " +
  "px-4 py-3 text-base outline-none focus:border-brand " +
  "[&_a]:text-brand [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc " +
  "[&_strong]:font-bold [&_p]:my-2";

/**
 * 상세 설명 전용 에디터. 손님 화면이 마크다운(react-markdown)으로
 * 렌더링하니 저장 형식은 그대로 마크다운 문자열을 쓴다 — 다만 사장님이
 * 문법을 외우거나 미리보기로 확인할 필요 없이, 지금 보이는 그대로가
 * 손님에게 보이는 모습인 위지윅(WYSIWYG) 편집을 한다. tiptap-markdown이
 * 편집 중인 문서와 마크다운 문자열을 서로 변환해준다.
 */
export function DescriptionEditor({
  productId,
  initial,
  onClose,
}: {
  productId: string;
  initial: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<
    ProductDescriptionState,
    FormData
  >(saveProductDescription, null);
  const [description, setDescription] = useState(initial);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "이런 분께 추천해요, 포함 사항 등을 자유롭게 써보세요.",
      }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setDescription(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: { class: editorContentClass },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      heading: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: ctx.editor?.isActive("bulletList") ?? false,
      link: ctx.editor?.isActive("link") ?? false,
    }),
  });

  function toggleLink() {
    if (!editor) return;

    if (editorState?.link) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const url = window.prompt("연결할 주소를 입력하세요", "https://");
    if (!url) return;

    const { from, empty } = editor.state.selection;
    if (empty) {
      const label = "링크 텍스트";
      editor.chain().focus().insertContentAt(from, label).run();
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to: from + label.length })
        .setLink({ href: url })
        .run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">상세 설명</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="text-muted hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={productId} />
        <input type="hidden" name="description" value={description} />

        <div>
          <div className="border-border bg-surface-subtle flex flex-wrap gap-1 rounded-t-lg border border-b-0 p-2">
            <ToolbarButton
              active={editorState?.heading}
              title="제목"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              제목
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.bold}
              title="굵게"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <b>굵게</b>
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.italic}
              title="기울임"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <i>기울임</i>
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.bulletList}
              title="목록"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              목록
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.link}
              title="링크"
              onClick={toggleLink}
            >
              링크
            </ToolbarButton>
          </div>
          <EditorContent editor={editor} />
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
      className={`rounded border px-2.5 py-1 text-xs ${
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-surface hover:bg-surface-subtle"
      }`}
    >
      {children}
    </button>
  );
}
