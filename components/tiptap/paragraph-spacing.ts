import { Extension, type CommandProps } from "@tiptap/core";

/**
 * 구글 독스의 "줄 및 단락 간격"과 같은 기능 — 문단(제목 포함) 단위로
 * 행간격(line-height)과 단락 앞/뒤 공백을 준다. 글자 단위가 아니라
 * 커서가 있거나 선택한 문단 전체에 적용된다.
 *
 * 단락 앞/뒤 공백은 margin이 아니라 padding으로 준다 — 문단에는 이미
 * 기본 여백(margin)이 있어서 margin을 더 주면 서로 겹쳐(collapse) 거의
 * 티가 안 나고, 메일 앱마다 기본 여백도 달라서다. padding은 겹치지
 * 않아 에디터·손님 화면·메일 어디서든 같은 만큼 벌어진다.
 */

/** 이 값들만 sanitize-description.ts가 통과시킨다 — 바꾸면 거기도 같이 바꾼다. */
export const PARAGRAPH_SPACE = "0.75em";
export const LINE_HEIGHT_MIN = 1;
export const LINE_HEIGHT_MAX = 3;
export const INDENT_STEP_EM = 2;
export const INDENT_MAX = 8;

export const LINE_HEIGHT_PRESETS = [
  { value: "1", label: "1.0 (단일)" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "2.0 (이중)" },
] as const;

/** 맞춤 간격 입력값을 저장할 형태("1.25" 등)로 — 범위를 벗어나거나 숫자가 아니면 null. */
export function normalizeLineHeight(input: string): string | null {
  const value = Number(input.trim());
  if (!Number.isFinite(value) || value < LINE_HEIGHT_MIN || value > LINE_HEIGHT_MAX) {
    return null;
  }
  return String(Math.round(value * 100) / 100);
}

const TYPES = ["paragraph", "heading"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      /** null이면 기본 행간격으로 되돌린다. */
      setLineHeight: (lineHeight: string | null) => ReturnType;
      setSpaceBefore: (on: boolean) => ReturnType;
      setSpaceAfter: (on: boolean) => ReturnType;
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              normalizeLineHeight(element.style.lineHeight || ""),
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${attributes.lineHeight}` }
                : {},
          },
          spaceBefore: {
            default: false,
            parseHTML: (element) => element.style.paddingTop === PARAGRAPH_SPACE,
            renderHTML: (attributes) =>
              attributes.spaceBefore
                ? { style: `padding-top: ${PARAGRAPH_SPACE}` }
                : {},
          },
          spaceAfter: {
            default: false,
            parseHTML: (element) =>
              element.style.paddingBottom === PARAGRAPH_SPACE,
            renderHTML: (attributes) =>
              attributes.spaceAfter
                ? { style: `padding-bottom: ${PARAGRAPH_SPACE}` }
                : {},
          },
          indent: {
            default: 0,
            parseHTML: (element) => {
              const em = parseFloat(element.style.marginLeft || "0");
              const level = Math.round(em / INDENT_STEP_EM);
              return Math.min(Math.max(level, 0), INDENT_MAX);
            },
            renderHTML: (attributes) =>
              attributes.indent
                ? { style: `margin-left: ${attributes.indent * INDENT_STEP_EM}em` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const apply =
      (attributes: Record<string, unknown>) =>
      ({ commands }: CommandProps) =>
        TYPES.map((type) => commands.updateAttributes(type, attributes)).some(Boolean);

    return {
      setLineHeight: (lineHeight) => apply({ lineHeight }),
      setSpaceBefore: (on) => apply({ spaceBefore: on }),
      setSpaceAfter: (on) => apply({ spaceAfter: on }),
      indent:
        () =>
        ({ editor, commands }) => {
          // 목록 안에서는 Tab처럼 항목을 한 단계 들여쓴다.
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            return commands.sinkListItem(
              editor.isActive("taskItem") ? "taskItem" : "listItem",
            );
          }
          const attrs = editor.getAttributes(
            editor.isActive("heading") ? "heading" : "paragraph",
          );
          const next = Math.min((attrs.indent ?? 0) + 1, INDENT_MAX);
          return TYPES.map((type) =>
            commands.updateAttributes(type, { indent: next }),
          ).some(Boolean);
        },
      outdent:
        () =>
        ({ editor, commands }) => {
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            return commands.liftListItem(
              editor.isActive("taskItem") ? "taskItem" : "listItem",
            );
          }
          const attrs = editor.getAttributes(
            editor.isActive("heading") ? "heading" : "paragraph",
          );
          const next = Math.max((attrs.indent ?? 0) - 1, 0);
          return TYPES.map((type) =>
            commands.updateAttributes(type, { indent: next }),
          ).some(Boolean);
        },
    };
  },
});
