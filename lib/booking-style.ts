/**
 * 예약 화면(/booking) 디자인 커스터마이징. Calendly류(로고 작게+강조색
 * 하나)를 기본으로 하되, 관리자가 요청한 대로 세일 표시 색상·텍스트
 * 색상/크기·박스 모서리/크기까지 각각 따로 고를 수 있게 넓힌 구성이다.
 *
 * 색상(accentColor/saleColor/textColor)은 컬러피커로 자유롭게 고르는
 * hex 문자열이라 인라인 style로 적용한다. 크기·모서리는 자유 입력을
 * 허용하면 레이아웃이 깨지기 쉬워, 몇 단계로 정해둔 값 중에서만
 * 고르게 하고 Tailwind 클래스로 매핑한다.
 */

export type BookingTextSize = "sm" | "md" | "lg";
export type BookingCardRadius = "none" | "md" | "xl" | "full";
export type BookingCardSize = "compact" | "standard" | "spacious";

export type BookingStyle = {
  /** "예약하기" 텍스트, 하단 "예약 조회" 버튼 등 행동 유도 요소. */
  accentColor: string;
  /** 할인율 배지. 배경은 이 색을 옅게 섞어 자동으로 계산한다. */
  saleColor: string;
  /** 상품명·가격 텍스트. */
  textColor: string;
  textSize: BookingTextSize;
  cardRadius: BookingCardRadius;
  cardSize: BookingCardSize;
};

export const DEFAULT_BOOKING_STYLE: BookingStyle = {
  accentColor: "#3d6fe0",
  saleColor: "#e11d48",
  textColor: "#0b1b2b",
  textSize: "md",
  cardRadius: "xl",
  cardSize: "standard",
};

export const TEXT_SIZE_OPTIONS: { value: BookingTextSize; label: string }[] = [
  { value: "sm", label: "작게" },
  { value: "md", label: "보통" },
  { value: "lg", label: "크게" },
];

export const CARD_RADIUS_OPTIONS: { value: BookingCardRadius; label: string }[] = [
  { value: "none", label: "각짐" },
  { value: "md", label: "기본" },
  { value: "xl", label: "둥글게" },
  { value: "full", label: "알약형" },
];

export const CARD_SIZE_OPTIONS: { value: BookingCardSize; label: string }[] = [
  { value: "compact", label: "좁게" },
  { value: "standard", label: "보통" },
  { value: "spacious", label: "넓게" },
];

const CARD_RADIUS_CLASS: Record<BookingCardRadius, string> = {
  none: "rounded-none",
  md: "rounded-xl",
  xl: "rounded-3xl",
  full: "rounded-full",
};

const CARD_PADDING_CLASS: Record<BookingCardSize, string> = {
  compact: "p-3",
  standard: "p-4",
  spacious: "p-5",
};

const THUMBNAIL_SIZE_CLASS: Record<BookingCardSize, string> = {
  compact: "h-16 w-16",
  standard: "h-20 w-20",
  spacious: "h-24 w-24",
};

const NAME_TEXT_CLASS: Record<BookingTextSize, string> = {
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-xl sm:text-2xl",
};

const PRICE_TEXT_CLASS: Record<BookingTextSize, string> = {
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-xl sm:text-2xl",
};

export function cardRadiusClass(radius: BookingCardRadius): string {
  return CARD_RADIUS_CLASS[radius] ?? CARD_RADIUS_CLASS[DEFAULT_BOOKING_STYLE.cardRadius];
}

export function cardPaddingClass(size: BookingCardSize): string {
  return CARD_PADDING_CLASS[size] ?? CARD_PADDING_CLASS[DEFAULT_BOOKING_STYLE.cardSize];
}

export function thumbnailSizeClass(size: BookingCardSize): string {
  return THUMBNAIL_SIZE_CLASS[size] ?? THUMBNAIL_SIZE_CLASS[DEFAULT_BOOKING_STYLE.cardSize];
}

export function nameTextClass(size: BookingTextSize): string {
  return NAME_TEXT_CLASS[size] ?? NAME_TEXT_CLASS[DEFAULT_BOOKING_STYLE.textSize];
}

export function priceTextClass(size: BookingTextSize): string {
  return PRICE_TEXT_CLASS[size] ?? PRICE_TEXT_CLASS[DEFAULT_BOOKING_STYLE.textSize];
}

/** 할인 배지 배경 — 세일 색을 흰색과 섞어 옅은 톤을 만든다(브라우저 color-mix). */
export function saleBadgeBackground(saleColor: string): string {
  return `color-mix(in srgb, ${saleColor} 14%, white)`;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

const TEXT_SIZE_VALUES = new Set(TEXT_SIZE_OPTIONS.map((opt) => opt.value));
const CARD_RADIUS_VALUES = new Set(CARD_RADIUS_OPTIONS.map((opt) => opt.value));
const CARD_SIZE_VALUES = new Set(CARD_SIZE_OPTIONS.map((opt) => opt.value));

/** DB에서 그대로 읽어온 값(jsonb라 타입이 느슨하다) — 필드마다 유효성을
 * 확인해, 모르는 값이나 깨진 값은 조용히 기본값으로 대체한다. */
export type RawBookingStyle = {
  accentColor?: string;
  saleColor?: string;
  textColor?: string;
  textSize?: string;
  cardRadius?: string;
  cardSize?: string;
};

export function resolveBookingStyle(
  raw: RawBookingStyle | null | undefined,
): BookingStyle {
  return {
    accentColor:
      raw?.accentColor && isValidHexColor(raw.accentColor)
        ? raw.accentColor
        : DEFAULT_BOOKING_STYLE.accentColor,
    saleColor:
      raw?.saleColor && isValidHexColor(raw.saleColor)
        ? raw.saleColor
        : DEFAULT_BOOKING_STYLE.saleColor,
    textColor:
      raw?.textColor && isValidHexColor(raw.textColor)
        ? raw.textColor
        : DEFAULT_BOOKING_STYLE.textColor,
    textSize: TEXT_SIZE_VALUES.has(raw?.textSize as BookingTextSize)
      ? (raw!.textSize as BookingTextSize)
      : DEFAULT_BOOKING_STYLE.textSize,
    cardRadius: CARD_RADIUS_VALUES.has(raw?.cardRadius as BookingCardRadius)
      ? (raw!.cardRadius as BookingCardRadius)
      : DEFAULT_BOOKING_STYLE.cardRadius,
    cardSize: CARD_SIZE_VALUES.has(raw?.cardSize as BookingCardSize)
      ? (raw!.cardSize as BookingCardSize)
      : DEFAULT_BOOKING_STYLE.cardSize,
  };
}
