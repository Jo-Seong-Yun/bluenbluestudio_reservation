"use client";

import { useActionState, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Bold,
  Eraser,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
} from "lucide-react";
import {
  saveProductDescription,
  type ProductDescriptionState,
} from "@/app/admin/actions";
import { Button, ErrorText } from "@/components/ui";
import { ResizableImage } from "@/components/tiptap/resizable-image";
import { publicImageUrl } from "@/lib/images";
import { uploadProductImage } from "@/lib/storage-upload";

const editorContentClass =
  "h-[600px] overflow-auto rounded-b-lg border border-t-0 border-border bg-surface " +
  "px-4 py-3 text-base outline-none focus:border-brand " +
  "[&_a]:text-brand [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc " +
  "[&_strong]:font-bold [&_p]:my-2";

/**
 * 상세 설명 전용 에디터. 지금 보이는 그대로가 손님에게 보이는 모습인
 * 위지윅(WYSIWYG) 편집을 한다. 저장 형식은 마크다운이 아니라 HTML이다
 * — 글자색이나 이미지처럼 마크다운으로는 표현할 수 없는 서식을 쓰려면
 * HTML이 필요하다. 손님 화면(components/rich-text.tsx)에서 저장 전과
 * 똑같이 한 번 더 정화(sanitize)해서 보여준다.
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "이런 분께 추천해요, 포함 사항 등을 자유롭게 써보세요.",
      }),
      TextStyle,
      Color,
      ResizableImage,
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setDescription(editor.getHTML());
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
      color: ctx.editor?.getAttributes("textStyle").color ?? "",
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

  // 팝업 없이, 고른 즉시 에디터 안에 넣는다. 자르기/크기 조절/위치 이동은
  // 삽입된 이미지를 직접 선택해서 그 자리에서 한다(ResizableImageView).
  // 업로드는 화면을 막지 않게 백그라운드로 돌리고, 그동안은 로컬
  // blob URL로 미리보기를 보여주다가 끝나면 진짜 주소로 바꿔치기한다.
  function pickImage(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return;
    const file = files[0];
    setUploadError(null);

    const blobUrl = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: blobUrl, alt: "" }).run();

    uploadProductImage(file, file.name)
      .then((path) => {
        replaceImageSrc(blobUrl, publicImageUrl(path));
      })
      .catch((cause) => {
        // 실패한 미리보기를 그대로 두면 깨진 이미지가 남으니 지운다.
        removeImageBySrc(blobUrl);
        setUploadError(
          cause instanceof Error
            ? `이미지를 올리지 못했습니다: ${cause.message}`
            : "이미지를 올리지 못했습니다.",
        );
      })
      .finally(() => URL.revokeObjectURL(blobUrl));
  }

  function findImageNodePos(src: string): number {
    if (!editor) return -1;
    let targetPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (targetPos !== -1) return false;
      if (node.type.name === "image" && node.attrs.src === src) {
        targetPos = pos;
      }
      return true;
    });
    return targetPos;
  }

  /** 그 blob URL을 쓰는 이미지 노드를 찾아 진짜 주소로 바꾼다. */
  function replaceImageSrc(fromSrc: string, toSrc: string) {
    if (!editor) return;
    const pos = findImageNodePos(fromSrc);
    if (pos === -1) return;

    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src: toSrc,
      }),
    );
  }

  /** 업로드에 실패한 이미지 노드를 찾아 문서에서 지운다. */
  function removeImageBySrc(src: string) {
    if (!editor) return;
    const pos = findImageNodePos(src);
    if (pos === -1) return;

    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
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
          <div className="flex flex-wrap items-center gap-1 rounded-t-lg bg-neutral-900 p-2">
            <ToolbarButton
              active={editorState?.heading}
              title="제목"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.bold}
              title="굵게"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.italic}
              title="기울임"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.bulletList}
              title="목록"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editorState?.link}
              title="링크"
              onClick={toggleLink}
            >
              <Link2 size={16} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-white/15" />

            <label
              title="글자색"
              className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-white/10"
            >
              <span
                className="h-4 w-4 rounded-full border border-white/40"
                style={{ backgroundColor: editorState?.color || "#ffffff" }}
              />
              <input
                type="color"
                value={editorState?.color || "#ffffff"}
                onChange={(event) =>
                  editor?.chain().focus().setColor(event.target.value).run()
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <ToolbarButton
              title="글자색 지우기"
              onClick={() => editor?.chain().focus().unsetColor().run()}
            >
              <Eraser size={16} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-white/15" />

            <ToolbarButton
              title="사진 삽입"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={16} />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                pickImage(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
          <EditorContent editor={editor} />
          <ErrorText>{uploadError}</ErrorText>
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
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded text-white disabled:opacity-40 ${
        active ? "bg-white/20" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
