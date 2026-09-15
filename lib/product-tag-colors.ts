/**
 * 상품 태그 색상 팔레트. 자유 색상이 아니라 여기 11개 중 하나만 고른다
 * — DB의 체크 제약(20260909000400_product_tag_color.sql +
 * 20260923000100_product_tag_color_google.sql)과 key 목록이 항상 같아야
 * 한다.
 *
 * 구글 캘린더 이벤트는 임의의 색을 못 넣고 구글이 정해둔 11가지
 * colorId 중 하나만 고를 수 있어(lib/google-calendar/calendar-api.ts),
 * 예약을 캘린더에 동기화할 때 상품 태그 색을 최대한 가깝게 매핑해야
 * 했다. 그 변환·근사 과정 자체를 없애려고, 사이트의 색상 후보를 처음부터
 * 구글 캘린더의 11색과 정확히 같게(같은 hex, 같은 순서) 잡았다 — 그래서
 * key가 그대로 구글 colorId 1~11에 1:1로 대응한다.
 */
export const PRODUCT_TAG_COLORS = [
  {
    key: "lavender",
    label: "라벤더",
    hex: "#7986cb",
    dot: "bg-[#7986cb]",
    cell: "bg-[#7986cb]/25 text-[#434a70] dark:text-[#c3c9e8]",
  },
  {
    key: "sage",
    label: "세이지",
    hex: "#33b679",
    dot: "bg-[#33b679]",
    cell: "bg-[#33b679]/25 text-[#1c6443] dark:text-[#a3dec3]",
  },
  {
    key: "grape",
    label: "포도",
    hex: "#8e24aa",
    dot: "bg-[#8e24aa]",
    cell: "bg-[#8e24aa]/25 text-[#4e145e] dark:text-[#cc9cd9]",
  },
  {
    key: "flamingo",
    label: "플라밍고",
    hex: "#e67c73",
    dot: "bg-[#e67c73]",
    cell: "bg-[#e67c73]/25 text-[#7f443f] dark:text-[#f4c4c0]",
  },
  {
    key: "banana",
    label: "바나나",
    hex: "#f6c026",
    dot: "bg-[#f6c026]",
    cell: "bg-[#f6c026]/25 text-[#876a15] dark:text-[#fbe39d]",
  },
  {
    key: "tangerine",
    label: "귤",
    hex: "#f5511d",
    dot: "bg-[#f5511d]",
    cell: "bg-[#f5511d]/25 text-[#872d10] dark:text-[#fbb199]",
  },
  {
    key: "peacock",
    label: "공작",
    hex: "#039be5",
    dot: "bg-[#039be5]",
    cell: "bg-[#039be5]/25 text-[#02557e] dark:text-[#8ed2f3]",
  },
  {
    key: "graphite",
    label: "흑연",
    hex: "#616161",
    dot: "bg-[#616161]",
    cell: "bg-[#616161]/25 text-[#353535] dark:text-[#b8b8b8]",
  },
  {
    key: "blueberry",
    label: "블루베리",
    hex: "#3f51b5",
    dot: "bg-[#3f51b5]",
    cell: "bg-[#3f51b5]/25 text-[#232d64] dark:text-[#a9b1de]",
  },
  {
    key: "basil",
    label: "바질",
    hex: "#0b8043",
    dot: "bg-[#0b8043]",
    cell: "bg-[#0b8043]/25 text-[#064625] dark:text-[#91c6aa]",
  },
  {
    key: "tomato",
    label: "토마토",
    hex: "#d60000",
    dot: "bg-[#d60000]",
    cell: "bg-[#d60000]/25 text-[#760000] dark:text-[#ed8c8c]",
  },
] as const;

export type ProductTagColorKey = (typeof PRODUCT_TAG_COLORS)[number]["key"];

const DOT_BY_KEY: Record<string, string> = Object.fromEntries(
  PRODUCT_TAG_COLORS.map((color) => [color.key, color.dot]),
);

const CELL_BY_KEY: Record<string, string> = Object.fromEntries(
  PRODUCT_TAG_COLORS.map((color) => [color.key, color.cell]),
);

/** 저장된 값이 알려진 색상 키면 그 점 색 클래스를, 아니면 null을 준다. */
export function tagColorDotClass(
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  return DOT_BY_KEY[key] ?? null;
}

/** 스케줄 캘린더의 예약 칸 배경/글자 색 클래스. 없으면 null(기본 색을 쓴다). */
export function tagColorCellClass(
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  return CELL_BY_KEY[key] ?? null;
}

/** 팔레트 key → 구글 캘린더 colorId(1~11). 팔레트를 구글 색과 똑같이
 *  잡아뒀기 때문에 이름 그대로 순서를 매긴 1:1 대응이다. */
const GOOGLE_CALENDAR_COLOR_ID: Record<string, string> = Object.fromEntries(
  PRODUCT_TAG_COLORS.map((color, index) => [color.key, String(index + 1)]),
);

/** 상품 태그 색에 대응하는 구글 캘린더 colorId. 없으면 undefined(구글 기본색). */
export function googleCalendarColorId(
  key: string | null | undefined,
): string | undefined {
  if (!key) return undefined;
  return GOOGLE_CALENDAR_COLOR_ID[key];
}
