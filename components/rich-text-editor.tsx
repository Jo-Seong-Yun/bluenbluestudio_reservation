"use client";

import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowUpDown,
  Baseline,
  Bold,
  Check,
  ChevronDown,
  Copy,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Indent,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Omega,
  Outdent,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
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
import { FindReplace, findReplaceKey } from "@/components/tiptap/find-replace";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  HIGHLIGHT_COLORS,
  SPECIAL_CHARACTERS,
  TEXT_COLORS,
} from "@/components/tiptap/formatting";
import { publicImageUrl } from "@/lib/images";
import { uploadProductImage } from "@/lib/storage-upload";

const editorContentBaseClass =
  "overflow-auto rounded-b-lg border border-t-0 border-border bg-surface " +
  "px-4 py-3 text-base outline-none focus:border-brand " +
  "[&_a]:text-brand [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc " +
  "[&_strong]:font-bold [&_p]:my-2 " +
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ml-0 " +
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:list-none " +
  "[&_ul[data-type=taskList]_li]:ml-0 [&_ul[data-type=taskList]_li]:gap-2 " +
  "[&_ul[data-type=taskList]_li>label]:mt-1 " +
  "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
  "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top " +
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface-subtle [&_th]:p-2 " +
  "[&_.find-match]:bg-yellow-200 [&_.find-match-active]:bg-orange-300 " +
  "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-brand";

/**
 * 위지윅(WYSIWYG) 서식 에디터 — 상품 상세 설명과 이메일 본문이 같은
 * 에디터(같은 툴바·같은 기능)를 쓴다. 구글 독스의 서식 도구를 기준으로
 * 실행취소/스타일/글꼴/크기/굵게·기울임·밑줄·취소선/색·형광펜/링크·
 * 사진/정렬·행간격/목록·체크리스트/들여쓰기, 그리고 "더보기"에
 * 위·아래첨자·인용·가로선·표·특수문자·찾기바꾸기·서식복사·서식지우기를
 * 담았다. 결과는 HTML로 onChange에 올려보내고, 보여주거나 보낼 때는
 * 각자 sanitizeDescriptionHtml로 한 번 더 정화한다.
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
  heightClass?: string;
  onFocus?: () => void;
  editorRef?: MutableRefObject<Editor | null>;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      // Link은 StarterKit에도 있어 중복 경고가 나므로 끄고 아래 것을 쓴다.
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage,
      ParagraphSpacing,
      FindReplace,
    ],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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

  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      const blockAttrs = e?.isActive("heading")
        ? e.getAttributes("heading")
        : (e?.getAttributes("paragraph") ?? {});
      return {
        bold: e?.isActive("bold") ?? false,
        italic: e?.isActive("italic") ?? false,
        underline: e?.isActive("underline") ?? false,
        strike: e?.isActive("strike") ?? false,
        subscript: e?.isActive("subscript") ?? false,
        superscript: e?.isActive("superscript") ?? false,
        h2: e?.isActive("heading", { level: 2 }) ?? false,
        h3: e?.isActive("heading", { level: 3 }) ?? false,
        bulletList: e?.isActive("bulletList") ?? false,
        orderedList: e?.isActive("orderedList") ?? false,
        taskList: e?.isActive("taskList") ?? false,
        blockquote: e?.isActive("blockquote") ?? false,
        link: e?.isActive("link") ?? false,
        inTable: e?.isActive("table") ?? false,
        color: (e?.getAttributes("textStyle").color as string) ?? "",
        highlight: (e?.getAttributes("highlight").color as string) ?? "",
        fontFamily: (e?.getAttributes("textStyle").fontFamily as string) ?? "",
        fontSize: (e?.getAttributes("textStyle").fontSize as string) ?? "",
        align: (e?.getAttributes("paragraph").textAlign as string) ?? "left",
        lineHeight: (blockAttrs.lineHeight as string | null) ?? null,
        spaceBefore: Boolean(blockAttrs.spaceBefore),
        spaceAfter: Boolean(blockAttrs.spaceAfter),
        canUndo: e?.can().undo() ?? false,
        canRedo: e?.can().redo() ?? false,
      };
    },
  });

  function pickImage(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return;
    const file = files[0];
    setUploadError(null);
    const blobUrl = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: blobUrl, alt: "" }).run();
    uploadProductImage(file, file.name)
      .then((path) => replaceImageSrc(editor, blobUrl, publicImageUrl(path)))
      .catch((cause) => {
        removeImageBySrc(editor, blobUrl);
        setUploadError(
          cause instanceof Error
            ? `이미지를 올리지 못했습니다: ${cause.message}`
            : "이미지를 올리지 못했습니다.",
        );
      })
      .finally(() => URL.revokeObjectURL(blobUrl));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg bg-neutral-900 p-2">
        <ToolbarButton
          title="실행취소"
          disabled={!s?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="다시실행"
          disabled={!s?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>

        <Divider />

        <StyleMenu editor={editor} h2={s?.h2 ?? false} h3={s?.h3 ?? false} />
        <FontFamilyMenu editor={editor} current={s?.fontFamily ?? ""} />
        <FontSizeControl editor={editor} current={s?.fontSize ?? ""} />

        <Divider />

        <ToolbarButton active={s?.bold} title="굵게" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.italic} title="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.underline} title="밑줄" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.strike} title="취소선" onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough size={16} />
        </ToolbarButton>

        <ColorMenu
          editor={editor}
          icon={<Baseline size={16} />}
          title="글자색"
          current={s?.color ?? ""}
          colors={TEXT_COLORS}
          onPick={(c) => editor?.chain().focus().setColor(c).run()}
          onClear={() => editor?.chain().focus().unsetColor().run()}
        />
        <ColorMenu
          editor={editor}
          icon={<Highlighter size={16} />}
          title="형광펜"
          current={s?.highlight ?? ""}
          colors={HIGHLIGHT_COLORS}
          onPick={(c) => editor?.chain().focus().setHighlight({ color: c }).run()}
          onClear={() => editor?.chain().focus().unsetHighlight().run()}
        />

        <Divider />

        <ToolbarButton active={s?.link} title="링크" onClick={() => toggleLink(editor, s?.link ?? false)}>
          <Link2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="사진 삽입" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton active={s?.align === "left"} title="왼쪽 정렬" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.align === "center"} title="가운데 정렬" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.align === "right"} title="오른쪽 정렬" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.align === "justify"} title="양쪽 정렬" onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={16} />
        </ToolbarButton>
        <LineSpacingMenu
          editor={editor}
          lineHeight={s?.lineHeight ?? null}
          spaceBefore={s?.spaceBefore ?? false}
          spaceAfter={s?.spaceAfter ?? false}
        />

        <Divider />

        <ToolbarButton active={s?.bulletList} title="글머리 기호 목록" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.orderedList} title="번호 매기기 목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton active={s?.taskList} title="체크리스트" onClick={() => editor?.chain().focus().toggleTaskList().run()}>
          <ListChecks size={16} />
        </ToolbarButton>
        <ToolbarButton title="들여쓰기 줄이기" onClick={() => editor?.chain().focus().outdent().run()}>
          <Outdent size={16} />
        </ToolbarButton>
        <ToolbarButton title="들여쓰기 늘리기" onClick={() => editor?.chain().focus().indent().run()}>
          <Indent size={16} />
        </ToolbarButton>

        <Divider />

        <MoreMenu
          editor={editor}
          subscript={s?.subscript ?? false}
          superscript={s?.superscript ?? false}
          blockquote={s?.blockquote ?? false}
          inTable={s?.inTable ?? false}
          onFind={() => setFindOpen(true)}
        />

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

      {findOpen ? (
        <FindReplacePanel editor={editor} onClose={() => setFindOpen(false)} />
      ) : null}

      <EditorContent editor={editor} />
      <ErrorText>{uploadError}</ErrorText>
    </div>
  );
}

// ── 링크·이미지 도우미 ──────────────────────────────────────────────

function toggleLink(editor: Editor | null, active: boolean) {
  if (!editor) return;
  if (active) {
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

function findImageNodePos(editor: Editor, src: string): number {
  let pos = -1;
  editor.state.doc.descendants((node, at) => {
    if (pos !== -1) return false;
    if (node.type.name === "image" && node.attrs.src === src) pos = at;
    return true;
  });
  return pos;
}

function replaceImageSrc(editor: Editor, fromSrc: string, toSrc: string) {
  const pos = findImageNodePos(editor, fromSrc);
  if (pos === -1) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: toSrc }),
  );
}

function removeImageBySrc(editor: Editor, src: string) {
  const pos = findImageNodePos(editor, src);
  if (pos === -1) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
}

// ── 공통 UI ────────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-1 h-5 w-px bg-white/15" />;
}

/** 툴바 안 드롭다운의 공통 껍데기 — 바깥 클릭·Esc로 닫고, mousedown을
 * 막아 에디터 선택이 풀리지 않게 한다(모달 안에서 Esc가 모달까지 닫는
 * 것도 막는다). */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);
  return ref;
}

function MenuTrigger({
  open,
  onToggle,
  title,
  children,
  width = "auto",
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-haspopup="menu"
      aria-expanded={open}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      style={{ minWidth: width }}
      className={`flex h-7 items-center gap-0.5 rounded px-1.5 text-sm text-white ${
        open ? "bg-white/20" : "hover:bg-white/10"
      }`}
    >
      {children}
      <ChevronDown size={12} />
    </button>
  );
}

function MenuPanel({
  ref,
  className = "w-52",
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      role="menu"
      className={`border-border bg-surface text-foreground absolute top-full left-0 z-30 mt-1 rounded-lg border p-1 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-subtle";

function CheckSlot({ on }: { on: boolean }) {
  return (
    <span className="flex w-4 shrink-0 justify-center">
      {on ? <Check size={14} /> : null}
    </span>
  );
}

// ── 스타일(문단 종류) 메뉴 ──────────────────────────────────────────

function StyleMenu({
  editor,
  h2,
  h3,
}: {
  editor: Editor | null;
  h2: boolean;
  h3: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const label = h2 ? "제목 1" : h3 ? "제목 2" : "본문";
  function apply(run: (e: Editor) => void) {
    if (editor) run(editor);
    setOpen(false);
  }
  return (
    <div className="relative" ref={ref}>
      <MenuTrigger open={open} onToggle={() => setOpen((v) => !v)} title="스타일" width="4.5rem">
        {label}
      </MenuTrigger>
      {open ? (
        <MenuPanel ref={ref} className="w-40">
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().setParagraph().run())}>
            <Pilcrow size={14} /> 본문
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}>
            <Heading2 size={14} /> 제목 1
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}>
            <Heading3 size={14} /> 제목 2
          </button>
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ── 글꼴 메뉴 ───────────────────────────────────────────────────────

function FontFamilyMenu({ editor, current }: { editor: Editor | null; current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const label = FONT_FAMILIES.find((f) => f.value === current)?.label ?? "기본";
  function apply(value: string) {
    if (editor) {
      if (value) editor.chain().focus().setFontFamily(value).run();
      else editor.chain().focus().unsetFontFamily().run();
    }
    setOpen(false);
  }
  return (
    <div className="relative" ref={ref}>
      <MenuTrigger open={open} onToggle={() => setOpen((v) => !v)} title="글꼴" width="5rem">
        {label}
      </MenuTrigger>
      {open ? (
        <MenuPanel ref={ref} className="max-h-72 w-40 overflow-auto">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.label}
              type="button"
              className={menuItemClass}
              style={{ fontFamily: f.value || undefined }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(f.value)}
            >
              <CheckSlot on={current === f.value || (!current && !f.value)} />
              {f.label}
            </button>
          ))}
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ── 글자 크기(− N +) ────────────────────────────────────────────────

function FontSizeControl({ editor, current }: { editor: Editor | null; current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const size = current ? parseInt(current, 10) : FONT_SIZE_DEFAULT;
  function set(next: number) {
    if (!editor) return;
    const clamped = Math.min(Math.max(next, FONT_SIZE_MIN), FONT_SIZE_MAX);
    editor.chain().focus().setFontSize(`${clamped}px`).run();
  }
  return (
    <div className="relative flex items-center" ref={ref}>
      <ToolbarButton title="글자 작게" onClick={() => set(size - 1)}>
        <Minus size={14} />
      </ToolbarButton>
      <button
        type="button"
        title="글자 크기"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-8 rounded text-sm text-white hover:bg-white/10"
      >
        {size}
      </button>
      <ToolbarButton title="글자 크게" onClick={() => set(size + 1)}>
        <Plus size={14} />
      </ToolbarButton>
      {open ? (
        <div ref={ref} role="menu" className="border-border bg-surface text-foreground absolute top-full left-1/2 z-30 mt-1 max-h-60 w-16 -translate-x-1/2 overflow-auto rounded-lg border p-1 shadow-lg">
          {FONT_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              className="flex w-full justify-center rounded px-2 py-1 text-sm hover:bg-surface-subtle"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                set(sz);
                setOpen(false);
              }}
            >
              {sz}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── 색상(글자색·형광펜) 팔레트 ──────────────────────────────────────

function ColorMenu({
  icon,
  title,
  current,
  colors,
  onPick,
  onClear,
}: {
  editor: Editor | null;
  icon: ReactNode;
  title: string;
  current: string;
  colors: readonly string[];
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 w-7 flex-col items-center justify-center rounded text-white ${open ? "bg-white/20" : "hover:bg-white/10"}`}
      >
        {icon}
        <span className="h-1 w-4 rounded-full" style={{ backgroundColor: current || "#ffffff" }} />
      </button>
      {open ? (
        <MenuPanel ref={ref} className="w-[196px]">
          <div className="grid grid-cols-7 gap-1 p-1">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className={`h-5 w-5 rounded border ${current.toLowerCase() === c.toLowerCase() ? "ring-brand ring-2" : "border-border"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            className="hover:bg-surface-subtle mt-1 flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            <Eraser size={12} /> 없음
          </button>
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ── 행간격·단락 간격 메뉴 ───────────────────────────────────────────

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
  const ref = useDismiss(open, () => setOpen(false));

  const isPreset =
    lineHeight === null || LINE_HEIGHT_PRESETS.some((p) => p.value === lineHeight);

  function toggleMenu() {
    setOpen((v) => !v);
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

  return (
    <div className="relative" ref={ref}>
      <MenuTrigger open={open} onToggle={toggleMenu} title="행간격 및 단락 간격">
        <ArrowUpDown size={16} />
      </MenuTrigger>
      {open ? (
        <MenuPanel ref={ref} className="w-56">
          <button type="button" role="menuitemradio" aria-checked={lineHeight === null} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().setLineHeight(null).run())} className={menuItemClass}>
            <CheckSlot on={lineHeight === null} /> 기본
          </button>
          {LINE_HEIGHT_PRESETS.map((preset) => (
            <button key={preset.value} type="button" role="menuitemradio" aria-checked={lineHeight === preset.value} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().setLineHeight(preset.value).run())} className={menuItemClass}>
              <CheckSlot on={lineHeight === preset.value} /> {preset.label}
            </button>
          ))}
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
            <CheckSlot on={!isPreset} />
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
              onChange={(e) => {
                setCustom(e.target.value);
                setCustomError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustom();
                }
              }}
              className={`bg-surface w-16 rounded border px-1.5 py-0.5 text-sm ${customError ? "border-red-500" : "border-border"}`}
            />
            <button type="button" onClick={applyCustom} className="text-brand shrink-0 text-xs font-medium hover:underline">
              적용
            </button>
          </div>
          {customError ? (
            <p className="px-2 pb-1 text-xs text-red-600 dark:text-red-400">
              {LINE_HEIGHT_MIN}~{LINE_HEIGHT_MAX} 사이 숫자를 입력해 주십시오.
            </p>
          ) : null}
          <div className="border-border my-1 border-t" />
          <button type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().setSpaceBefore(!spaceBefore).run())} className={menuItemClass}>
            <CheckSlot on={false} /> {spaceBefore ? "단락 앞 공백 삭제" : "단락 앞 공백 추가"}
          </button>
          <button type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => apply((e) => e.chain().focus().setSpaceAfter(!spaceAfter).run())} className={menuItemClass}>
            <CheckSlot on={false} /> {spaceAfter ? "단락 뒤 공백 삭제" : "단락 뒤 공백 추가"}
          </button>
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ── 더보기 메뉴(표·특수문자·찾기 등) ────────────────────────────────

function MoreMenu({
  editor,
  subscript,
  superscript,
  blockquote,
  inTable,
  onFind,
}: {
  editor: Editor | null;
  subscript: boolean;
  superscript: boolean;
  blockquote: boolean;
  inTable: boolean;
  onFind: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [charsOpen, setCharsOpen] = useState(false);
  const ref = useDismiss(open, () => {
    setOpen(false);
    setCharsOpen(false);
  });
  function run(fn: (e: Editor) => void, keepOpen = false) {
    if (editor) fn(editor);
    if (!keepOpen) setOpen(false);
  }
  return (
    <div className="relative" ref={ref}>
      <MenuTrigger open={open} onToggle={() => setOpen((v) => !v)} title="더보기">
        <MoreHorizontal size={16} />
      </MenuTrigger>
      {open ? (
        <MenuPanel ref={ref} className="right-0 left-auto w-56">
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().toggleSubscript().run())}>
            <CheckSlot on={subscript} /> <SubscriptIcon size={14} /> 아래 첨자
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().toggleSuperscript().run())}>
            <CheckSlot on={superscript} /> <SuperscriptIcon size={14} /> 위 첨자
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().toggleBlockquote().run())}>
            <CheckSlot on={blockquote} /> <Quote size={14} /> 인용
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().setHorizontalRule().run())}>
            <CheckSlot on={false} /> <Minus size={14} /> 가로줄
          </button>

          <div className="border-border my-1 border-t" />

          {!inTable ? (
            <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
              <CheckSlot on={false} /> <TableIcon size={14} /> 표 삽입 (3×3)
            </button>
          ) : (
            <>
              <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().addRowAfter().run(), true)}>
                <CheckSlot on={false} /> 아래에 행 추가
              </button>
              <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().addColumnAfter().run(), true)}>
                <CheckSlot on={false} /> 오른쪽에 열 추가
              </button>
              <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().deleteRow().run(), true)}>
                <CheckSlot on={false} /> 행 삭제
              </button>
              <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().deleteColumn().run(), true)}>
                <CheckSlot on={false} /> 열 삭제
              </button>
              <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().deleteTable().run())}>
                <CheckSlot on={false} /> 표 삭제
              </button>
            </>
          )}

          <div className="border-border my-1 border-t" />

          <div className="relative">
            <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => setCharsOpen((v) => !v)}>
              <CheckSlot on={false} /> <Omega size={14} /> 특수문자 <ChevronDown size={12} className="ml-auto" />
            </button>
            {charsOpen ? (
              <div className="border-border bg-surface absolute top-0 left-full z-40 ml-1 grid max-h-64 w-64 grid-cols-8 gap-0.5 overflow-auto rounded-lg border p-2 shadow-lg">
                {SPECIAL_CHARACTERS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className="hover:bg-surface-subtle flex h-7 items-center justify-center rounded text-base"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => run((e) => e.chain().focus().insertContent(ch).run())}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onFind(); }}>
            <CheckSlot on={false} /> <Search size={14} /> 찾기 및 바꾸기
          </button>
          <button type="button" className={menuItemClass} onMouseDown={(e) => e.preventDefault()} onClick={() => run((e) => e.chain().focus().unsetAllMarks().clearNodes().run())}>
            <CheckSlot on={false} /> <Copy size={14} /> 서식 지우기
          </button>
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ── 찾기 및 바꾸기 패널 ─────────────────────────────────────────────

function FindReplacePanel({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const status = useEditorState({
    editor,
    selector: (ctx) => {
      const st = ctx.editor ? findReplaceKey.getState(ctx.editor.state) : null;
      return { count: st?.results.length ?? 0, index: st?.index ?? 0 };
    },
  });

  useEffect(() => {
    editor?.commands.setSearchTerm(term);
  }, [editor, term]);
  useEffect(() => {
    return () => {
      editor?.commands.setSearchTerm("");
    };
  }, [editor]);

  const total = status?.count ?? 0;
  return (
    <div className="border-border bg-surface-subtle flex flex-wrap items-center gap-2 border-x border-b p-2 text-sm">
      <input
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="찾기"
        className="border-border bg-surface w-32 rounded border px-2 py-1"
      />
      <span className="text-muted w-14 text-xs">
        {total ? `${(status?.index ?? 0) + 1}/${total}` : "0/0"}
      </span>
      <button type="button" onClick={() => editor?.commands.goToMatch(-1)} className="border-border hover:bg-surface rounded border px-2 py-1 text-xs">
        이전
      </button>
      <button type="button" onClick={() => editor?.commands.goToMatch(1)} className="border-border hover:bg-surface rounded border px-2 py-1 text-xs">
        다음
      </button>
      <input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="바꾸기"
        className="border-border bg-surface w-32 rounded border px-2 py-1"
      />
      <button type="button" onClick={() => { editor?.commands.replaceCurrent(replacement); editor?.commands.setSearchTerm(term); }} className="border-border hover:bg-surface rounded border px-2 py-1 text-xs">
        바꾸기
      </button>
      <button type="button" onClick={() => { editor?.commands.replaceAll(replacement); editor?.commands.setSearchTerm(term); }} className="border-border hover:bg-surface rounded border px-2 py-1 text-xs">
        모두 바꾸기
      </button>
      <button type="button" onClick={onClose} className="text-muted hover:text-foreground ml-auto px-1 text-lg leading-none">
        ×
      </button>
    </div>
  );
}

// ── 툴바 버튼 ───────────────────────────────────────────────────────

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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
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
