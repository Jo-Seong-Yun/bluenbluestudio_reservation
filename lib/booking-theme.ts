/**
 * 예약 화면(/booking) 꾸미기용 테마 프리셋. 린크트리처럼 "구조는
 * 고정, 색·모양만 갈아끼우는" 방식이다 — 여기 정의한 값 하나하나가
 * 실제 손님 화면(app/booking/page.tsx)과 관리자 미리보기
 * (app/admin/(dashboard)/settings/booking-theme-picker.tsx) 양쪽에서
 * 그대로 쓰인다.
 *
 * 방문자의 시스템 다크모드 설정은 따르지 않는다 — 테마 자체가 이미
 * "이 페이지의 고정된 색"이라는 관리자의 선택이라, 손님 기기 설정에
 * 따라 색이 또 바뀌면 관리자가 고른 느낌과 달라진다.
 */

export type BookingThemeId = "blue" | "cream" | "dark";

export type BookingTheme = {
  id: BookingThemeId;
  label: string;
  /** 프리셋 고르는 화면에 보여줄 한 줄 설명. */
  description: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  cardRadius: string;
  heading: string;
  muted: string;
  mutedFaint: string;
  badgeBg: string;
  badgeText: string;
  ctaText: string;
  ctaButtonBg: string;
  ctaButtonText: string;
  avatarBg: string;
  avatarBorder: string;
  /** 관리자 프리셋 선택 화면의 작은 색상 미리보기 칩. */
  swatchClass: string;
};

export const BOOKING_THEMES: readonly BookingTheme[] = [
  {
    id: "blue",
    label: "소프트 블루",
    description: "지금 브랜드 컬러를 그대로 살린 기본 테마",
    pageBg: "bg-gradient-to-b from-sky-50 via-white to-white",
    cardBg: "bg-white",
    cardBorder: "border-sky-100",
    cardRadius: "rounded-2xl",
    heading: "text-slate-900",
    muted: "text-slate-500",
    mutedFaint: "text-slate-300",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-600",
    ctaText: "text-brand",
    ctaButtonBg: "bg-sky-600",
    ctaButtonText: "text-white",
    avatarBg: "bg-white",
    avatarBorder: "border-sky-100",
    swatchClass: "bg-gradient-to-br from-sky-100 to-white",
  },
  {
    id: "cream",
    label: "웜 크림 미니멀",
    description: "따뜻한 톤과 각진 카드로 필름 인화지 같은 느낌",
    pageBg: "bg-[#f7f3ec]",
    cardBg: "bg-[#fffdf9]",
    cardBorder: "border-[#e8ddc9]",
    cardRadius: "rounded-md",
    heading: "text-[#2f271b]",
    muted: "text-[#8a7d63]",
    mutedFaint: "text-[#c9bd9f]",
    badgeBg: "bg-[#efe6d2]",
    badgeText: "text-[#8a6d3b]",
    ctaText: "text-[#8a6d3b]",
    ctaButtonBg: "bg-[#8a6d3b]",
    ctaButtonText: "text-white",
    avatarBg: "bg-[#fffdf9]",
    avatarBorder: "border-[#e8ddc9]",
    swatchClass: "bg-gradient-to-br from-[#f7f3ec] to-[#e8ddc9]",
  },
  {
    id: "dark",
    label: "다크 모던",
    description: "어두운 배경과 라임 포인트 컬러로 젊고 트렌디하게",
    pageBg: "bg-neutral-950",
    cardBg: "bg-neutral-900",
    cardBorder: "border-neutral-800",
    cardRadius: "rounded-full",
    heading: "text-white",
    muted: "text-neutral-400",
    mutedFaint: "text-neutral-600",
    badgeBg: "bg-neutral-800",
    badgeText: "text-lime-400",
    ctaText: "text-lime-400",
    ctaButtonBg: "bg-lime-400",
    ctaButtonText: "text-neutral-950",
    avatarBg: "bg-neutral-900",
    avatarBorder: "border-neutral-800",
    swatchClass: "bg-gradient-to-br from-neutral-900 to-black",
  },
];

export const DEFAULT_BOOKING_THEME_ID: BookingThemeId = "blue";

const THEME_BY_ID = new Map(BOOKING_THEMES.map((theme) => [theme.id, theme]));

export function resolveBookingTheme(id: string | null | undefined): BookingTheme {
  return (
    THEME_BY_ID.get(id as BookingThemeId) ??
    THEME_BY_ID.get(DEFAULT_BOOKING_THEME_ID)!
  );
}

export type BookingSocialLink = { label: string; url: string };
