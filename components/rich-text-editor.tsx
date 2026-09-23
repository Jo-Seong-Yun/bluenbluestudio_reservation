"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import {
  ArrowUpDown,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Eraser,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
} from "lucide-react";
import { ErrorText } from "@/components/ui";
import { ResizableImage } from "@/components/tiptap/resizable-image";
import {
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_PRESETS,
  ParagraphSpacing,
  normalizeLineHeight,
} from "@/components/tiptap/paragraph-spacing";
import { publicImageUrl } from "@/lib/images";
import { uploadProductImage } from "@/lib/storage-upload";

const editorContentBaseClass =
  "overflow-auto rounded-b-lg border border-t-0 border-border bg-surface " +
  "px-4 py-3 text-base outline-none focus:border-brand " +
  "[&_a]:text-brand [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc " +
  "[&_strong]:font-bold [&_p]:my-2";

/**
 * 위지윅(WYSIWYG) 서식 에디터 — 상품 상세 설명과 이메일 본문이 같은
 * 에디터(같은 툴바·같은 기능)를 쓴다. 결과는 HTML로 onChange에 올려보내고,
 * 보여주거나 보낼 때는 각자 sanitizeDescriptionHtml로 한 번 더 정화한다.
 *
 * initial은 처음 마운트될 때만 읽는다 — 내용을 통째로 바꿔야 하면 부모가
 * key를 바꿔 새로 마운트한다.
 */
export function RichTextEditor({
  initial,
  onChange,
  placeholder,
  heightClass = "h-[600px]",
  onFocus,
  editorRef,
}: {
  initial: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 편집 영역 높이(Tailwind 클래스). */
  heightClass?: string;
  onFocus?: () => void;
  /** 바깥에서 커서 위치에 글자를 끼워 넣어야 할 때(이메일 {{변수}} 버튼). */
  editorRef?: MutableRefObject<Editor | null>;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage,
      ParagraphSpacing,
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => onFocus?.(),
    editorProps: {
      attributes: { class: `${heightClass} ${editorContentBaseClass}` },
    },
  });

  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      heading: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: ctx.editor?.isActive("bulletList") ?? false,
      link: ctx.editor?.isActive("link") ?? false,
      color: ctx.editor?.getAttributes("textStyle").color ?? "",
      align: ctx.editor?.getAttributes("paragraph").textAlign ?? "left",
      ...blockSpacing(ctx.editor),
    }),
  });

  function toggleLink() {
    if (!editor) return;

    if (editorState?.link) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const url = window.prompt("연결할 주소를 입력해 주십시오", "https://");
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
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg bg-neutral-900 p-2">
        <ToolbarButton
          active={editorState?.heading}
          title="제목"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
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
        <ToolbarButton active={editorState?.link} title="링크" onClick={toggleLink}>
          <Link2 size={16} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-white/15" />

        <ToolbarButton
          active={editorState?.align === "left"}
          title="왼쪽 정렬"
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editorState?.align === "center"}
          title="가운데 정렬"
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editorState?.align === "right"}
          title="오른쪽 정렬"
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editorState?.align === "justify"}
          title="양쪽 정렬"
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <LineSpacingMenu
          editor={editor}
          lineHeight={editorState?.lineHeight ?? null}
          spaceBefore={editorState?.spaceBefore ?? false}
          spaceAfter={editorState?.spaceAfter ?? false}
        />

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

        <ToolbarButton title="사진 삽입" onClick={() => fileInputRef.current?.click()}>
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
  );
}

/** 커서가 있는 문단(또는 제목)의 행간격·단락 공백 — 툴바 메뉴의 ✓ 표시용. */
function blockSpacing(editor: Editor | null) {
  const attrs = editor?.isActive("heading")
    ? editor.getAttributes("heading")
    : (editor?.getAttributes("paragraph") ?? {});
  return {
    lineHeight: (attrs.lineHeight as string | null) ?? null,
    spaceBefore: Boolean(attrs.spaceBefore),
    spaceAfter: Boolean(attrs.spaceAfter),
  };
}

/**
 * 구글 독스의 "줄 및 단락 간격" 메뉴를 따른 드롭다운. 위에는 행간격
 * (기본/1.0/1.15/1.5/2.0/맞춤), 아래에는 단락 앞/뒤 공백 추가·삭제가
 * 있고, 커서가 있는 문단의 현재 값에 ✓가 붙는다. 메뉴 버튼은
 * mousedown을 막아 에디터의 선택 영역이 풀리지 않게 한다.
 */
function LineSpacingMenu({
  editor,
  lineHeight,
  spaceBefore,
  spaceAfter,
}: {
  editor: Editor | null;
  lineHeight: string | null;
  spaceBefore: boolean;
  spaceAfter: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // 모달(dialog) 안에서 Esc가 모달까지 닫지 않게 메뉴만 닫는다.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const isPreset =
    lineHeight === null || LINE_HEIGHT_PRESETS.some((p) => p.value === lineHeight);

  function toggleMenu() {
    setOpen((prev) => !prev);
    setCustom(isPreset ? "" : (lineHeight ?? ""));
    setCustomError(false);
  }

  function apply(run: (e: Editor) => void) {
    if (!editor) return;
    run(editor);
    setOpen(false);
  }

  function applyCustom() {
    const value = normalizeLineHeight(custom);
    if (!value) {
      setCustomError(true);
      return;
    }
    apply((e) => e.chain().focus().setLineHeight(value).run());
  }

  const item =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-subtle";
  const checkSlot = (on: boolean) => (
    <span className="flex w-4 shrink-0 justify-center">
      {on ? <Check size={14} /> : null}
    </span>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="행간격 및 단락 간격"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleMenu}
        className={`flex h-7 items-center gap-0.5 rounded px-1 text-white ${
          open ? "bg-white/20" : "hover:bg-white/10"
        }`}
      >
        <ArrowUpDown size={16} />
        <ChevronDown size={12} />
      </button>

      {open ? (
        <div
          role="menu"
          className="border-border bg-surface text-foreground absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={lineHeight === null}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply((e) => e.chain().focus().setLineHeight(null).run())}
            className={item}
          >
            {checkSlot(lineHeight === null)}
            기본
          </button>
          {LINE_HEIGHT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              role="menuitemradio"
              aria-checked={lineHeight === preset.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                apply((e) => e.chain().focus().setLineHeight(preset.value).run())
              }
              className={item}
            >
              {checkSlot(lineHeight === preset.value)}
              {preset.label}
            </button>
          ))}

          <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
            {checkSlot(!isPreset)}
            <span className="shrink-0">맞춤</span>
            <input
              type="number"
              inputMode="decimal"
              step={0.05}
              min={LINE_HEIGHT_MIN}
              max={LINE_HEIGHT_MAX}
              value={custom}
              placeholder="1.25"
              aria-label={`맞춤 행간격 (${LINE_HEIGHT_MIN}~${LINE_HEIGHT_MAX})`}
              aria-invalid={customError}
              onChange={(event) => {
                setCustom(event.target.value);
                setCustomError(false);
              }}
              onKeyDown={(event) => {
                // 폼 안이라 Enter가 제출로 이어지지 않게 막고 바로 적용한다.
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustom();
                }
              }}
              className={`bg-surface w-16 rounded border px-1.5 py-0.5 text-sm ${
                customError ? "border-red-500" : "border-border"
              }`}
            />
            <button
              type="button"
              onClick={applyCustom}
              className="text-brand shrink-0 text-xs font-medium hover:underline"
            >
              적용
            </button>
          </div>
          {customError ? (
            <p className="px-2 pb-1 text-xs text-red-600 dark:text-red-400">
              {LINE_HEIGHT_MIN}~{LINE_HEIGHT_MAX} 사이 숫자를 입력해 주십시오.
            </p>
          ) : null}

          <div className="border-border my-1 border-t" />

          <button
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              apply((e) => e.chain().focus().setSpaceBefore(!spaceBefore).run())
            }
            className={item}
          >
            {checkSlot(false)}
            {spaceBefore ? "단락 앞 공백 삭제" : "단락 앞 공백 추가"}
          </button>
          <button
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              apply((e) => e.chain().focus().setSpaceAfter(!spaceAfter).run())
            }
            className={item}
          >
            {checkSlot(false)}
            {spaceAfter ? "단락 뒤 공백 삭제" : "단락 뒤 공백 추가"}
          </button>
        </div>
      ) : null}
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
