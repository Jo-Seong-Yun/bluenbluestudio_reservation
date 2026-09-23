/**
 * 에디터 서식 값의 단일 출처. 툴바(넣는 쪽)와 sanitize-description.ts
 * (검증하는 쪽)가 같은 목록을 봐야 해서 여기 모아둔다 — 여기에 없는
 * 글꼴·크기·색은 저장·발송 단계에서 걸러진다.
 */

/** 글꼴 — value는 실제 CSS font-family 스택. 손님 화면에선 이 글꼴로,
 * 메일에선 대부분 기본 글꼴로 보인다(메일 앱이 웹폰트를 못 불러옴). */
export const FONT_FAMILIES = [
  { label: "기본", value: "" },
  { label: "본고딕", value: "'Noto Sans KR', sans-serif" },
  { label: "나눔고딕", value: "'Nanum Gothic', sans-serif" },
  { label: "나눔명조", value: "'Nanum Myeongjo', serif" },
  { label: "맑은 고딕", value: "'Malgun Gothic', sans-serif" },
  { label: "돋움", value: "Dotum, sans-serif" },
  { label: "바탕", value: "Batang, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "고정폭", value: "monospace" },
] as const;

/** 글자 크기(px). 목록 선택 + −/+ 로 조절. */
export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48] as const;
export const FONT_SIZE_DEFAULT = 16;
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 96;

/** 글자색 팔레트(구글 독스식 격자). 첫 줄은 무채색. */
export const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#ffffff",
  "#e60000", "#ff9900", "#ffd500", "#00b050", "#00b0f0", "#0070c0", "#7030a0",
  "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#cfe2f3", "#c9daf8", "#d9d2e9",
] as const;

/** 형광펜 팔레트 — 연한 색 위주. "없음"은 팔레트에서 따로 버튼으로 뺀다. */
export const HIGHLIGHT_COLORS = [
  "#fff2cc", "#fce5cd", "#f4cccc", "#d9ead3", "#cfe2f3", "#d9d2e9",
  "#ffe599", "#f9cb9c", "#ea9999", "#b6d7a8", "#9fc5e8", "#b4a7d6",
] as const;

/** 특수문자 — 자주 쓰는 것 위주. */
export const SPECIAL_CHARACTERS = [
  "·", "•", "◦", "‣", "■", "□", "▶", "▷", "★", "☆", "♥", "♡",
  "✓", "✔", "✗", "✘", "→", "←", "↑", "↓", "⇒", "⟶", "※", "☎",
  "©", "®", "™", "℃", "℉", "°", "±", "×", "÷", "≠", "≒", "∞",
  "「", "」", "『", "』", "【", "】", "〈", "〉", "《", "》", "…", "―",
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "㉠", "㉡",
] as const;

const FONT_VALUE_SET = new Set<string>(
  FONT_FAMILIES.map((f) => f.value).filter(Boolean),
);

/** 저장 전, 허용 목록에 있는 글꼴 스택인지. */
export function isAllowedFontFamily(value: string): boolean {
  return FONT_VALUE_SET.has(value.trim());
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** sanitize-html의 allowedStyles는 RegExp 배열만 받아, 허용 글꼴을 정규식으로 만든다. */
export const FONT_FAMILY_STYLE_REGEX = new RegExp(
  `^(?:${FONT_FAMILIES.map((f) => f.value)
    .filter(Boolean)
    .map(escapeRegExp)
    .join("|")})$`,
);
