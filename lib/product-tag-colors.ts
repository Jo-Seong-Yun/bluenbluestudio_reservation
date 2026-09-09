/**
 * 상품 태그 색상 팔레트. 자유 색상이 아니라 여기 10개 중 하나만 고른다
 * — DB의 체크 제약(20260909000400_product_tag_color.sql)과 key 목록이
 * 항상 같아야 한다. 부드러운 톤을 쓰려고 각 색의 300 단계(점)와
 * 500/25 투명도(칸 배경, 스케줄 캘린더용)를 쓴다.
 */
export const PRODUCT_TAG_COLORS = [
  {
    key: "rose",
    label: "로즈",
    dot: "bg-rose-300",
    cell: "bg-rose-500/25 text-rose-800 dark:text-rose-300",
  },
  {
    key: "orange",
    label: "오렌지",
    dot: "bg-orange-300",
    cell: "bg-orange-500/25 text-orange-800 dark:text-orange-300",
  },
  {
    key: "amber",
    label: "앰버",
    dot: "bg-amber-300",
    cell: "bg-amber-500/25 text-amber-800 dark:text-amber-300",
  },
  {
    key: "lime",
    label: "라임",
    dot: "bg-lime-300",
    cell: "bg-lime-500/25 text-lime-800 dark:text-lime-300",
  },
  {
    key: "emerald",
    label: "에메랄드",
    dot: "bg-emerald-300",
    cell: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300",
  },
  {
    key: "teal",
    label: "틸",
    dot: "bg-teal-300",
    cell: "bg-teal-500/25 text-teal-800 dark:text-teal-300",
  },
  {
    key: "sky",
    label: "스카이",
    dot: "bg-sky-300",
    cell: "bg-sky-500/25 text-sky-800 dark:text-sky-300",
  },
  {
    key: "indigo",
    label: "인디고",
    dot: "bg-indigo-300",
    cell: "bg-indigo-500/25 text-indigo-800 dark:text-indigo-300",
  },
  {
    key: "violet",
    label: "바이올렛",
    dot: "bg-violet-300",
    cell: "bg-violet-500/25 text-violet-800 dark:text-violet-300",
  },
  {
    key: "pink",
    label: "핑크",
    dot: "bg-pink-300",
    cell: "bg-pink-500/25 text-pink-800 dark:text-pink-300",
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
