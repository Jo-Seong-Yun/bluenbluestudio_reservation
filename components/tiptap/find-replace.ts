import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * 구글 독스의 "찾기 및 바꾸기". 문서 전체에서 검색어를 찾아 노란색으로
 * 표시하고(현재 항목은 진하게), 하나씩 또는 전부 바꾼다. ProseMirror
 * 데코레이션으로 표시만 하므로 실제 문서 내용은 바꿀 때만 건드린다.
 */

export interface FindReplaceState {
  term: string;
  results: { from: number; to: number }[];
  index: number;
}

export const findReplaceKey = new PluginKey<FindReplaceState>("findReplace");

function collectMatches(doc: import("@tiptap/pm/model").Node, term: string) {
  const results: { from: number; to: number }[] = [];
  if (!term) return results;
  const needle = term.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = node.text.toLowerCase();
    let from = 0;
    let at = haystack.indexOf(needle, from);
    while (at !== -1) {
      results.push({ from: pos + at, to: pos + at + term.length });
      from = at + term.length;
      at = haystack.indexOf(needle, from);
    }
  });
  return results;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      setSearchTerm: (term: string) => ReturnType;
      goToMatch: (dir: 1 | -1) => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const FindReplace = Extension.create({
  name: "findReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindReplaceState>({
        key: findReplaceKey,
        state: {
          init: () => ({ term: "", results: [], index: 0 }),
          apply(tr, prev) {
            const meta = tr.getMeta(findReplaceKey) as
              | Partial<FindReplaceState>
              | undefined;
            if (meta?.term !== undefined) {
              const results = collectMatches(tr.doc, meta.term);
              return { term: meta.term, results, index: 0 };
            }
            if (meta?.index !== undefined) {
              return { ...prev, index: meta.index };
            }
            if (tr.docChanged && prev.term) {
              const results = collectMatches(tr.doc, prev.term);
              return {
                ...prev,
                results,
                index: Math.min(prev.index, Math.max(results.length - 1, 0)),
              };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const s = findReplaceKey.getState(state);
            if (!s || s.results.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              s.results.map((r, i) =>
                Decoration.inline(r.from, r.to, {
                  class:
                    i === s.index ? "find-match find-match-active" : "find-match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchTerm:
        (term) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findReplaceKey, { term }));
          return true;
        },
      goToMatch:
        (dir) =>
        ({ state, tr, dispatch, view }) => {
          const s = findReplaceKey.getState(state);
          if (!s || s.results.length === 0) return false;
          const index =
            (s.index + dir + s.results.length) % s.results.length;
          if (dispatch) dispatch(tr.setMeta(findReplaceKey, { index }));
          const target = s.results[index];
          if (view && target) {
            view.dispatch(
              view.state.tr.scrollIntoView().setMeta("preventUpdate", true),
            );
          }
          return true;
        },
      replaceCurrent:
        (replacement) =>
        ({ state, dispatch }) => {
          const s = findReplaceKey.getState(state);
          if (!s || s.results.length === 0) return false;
          const target = s.results[s.index];
          if (!target) return false;
          if (dispatch) {
            const tr = state.tr.insertText(replacement, target.from, target.to);
            dispatch(tr);
          }
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, dispatch }) => {
          const s = findReplaceKey.getState(state);
          if (!s || s.results.length === 0) return false;
          if (dispatch) {
            const tr = state.tr;
            // 뒤에서부터 바꿔야 앞쪽 위치가 안 밀린다.
            for (let i = s.results.length - 1; i >= 0; i--) {
              const r = s.results[i];
              tr.insertText(replacement, r.from, r.to);
            }
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
