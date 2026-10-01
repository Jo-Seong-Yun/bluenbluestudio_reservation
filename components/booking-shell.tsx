import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO, SITE } from "@/lib/site";
import { DEFAULT_BOOKING_STYLE, type BookingStyle } from "@/lib/booking-style";

/** 고객 예약 화면만 새 팔레트를 적용해 관리자와 다른 페이지의 색은 유지한다. */
export function BookingShell({
  children,
  style = DEFAULT_BOOKING_STYLE,
}: {
  children: ReactNode;
  style?: BookingStyle;
}) {
  return (
    <div
      className="booking-workspace"
      style={
        {
          "--brand": style.accentColor,
          "--brand-hover": `color-mix(in srgb, ${style.accentColor} 85%, black)`,
          "--accent": style.accentColor,
          "--booking-text": style.textColor,
        } as CSSProperties
      }
    >
      <header className="booking-header">
        <div className="booking-header-inner">
          <Link
            href="/booking"
            className="booking-brand"
            aria-label={`${SITE.name} 상품 목록`}
          >
            <Image
              src={BRAND_LOGO.src}
              alt={SITE.name}
              width={BRAND_LOGO.width}
              height={BRAND_LOGO.height}
              priority
              className="h-14 w-28 object-contain"
            />
            <span>
              BLUE N BLUE
              <br />
              STUDIO BOOKING
            </span>
          </Link>
          <nav aria-label="예약 메뉴">
            <Link href="/booking">촬영 상품</Link>
            <Link href="/booking/lookup">예약 조회</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="booking-footer">
        <strong>{SITE.name}</strong>
        <p>촬영 일정은 희망 시간 확인 후 개별 안내합니다.</p>
        <Link href="/booking/lookup">예약 조회 →</Link>
      </footer>
    </div>
  );
}

export type BookingStage = "products" | "times" | "form" | "review" | "success";
const stages: BookingStage[] = [
  "products",
  "times",
  "form",
  "review",
  "success",
];
const labels = [
  "상품 선택",
  "희망 시간",
  "신청 정보",
  "내용 확인",
  "접수 완료",
];
export function BookingSteps({ stage }: { stage: BookingStage }) {
  const current = stages.indexOf(stage);
  return (
    <ol className="booking-steps" aria-label="예약 진행 단계">
      {stages.map((s, i) => (
        <li
          key={s}
          aria-current={s === stage ? "step" : undefined}
          className={i === current ? "active" : i < current ? "done" : ""}
        >
          <span className="booking-step-number" aria-hidden>
            {i < current ? "✓" : i + 1}
          </span>
          <span>{labels[i]}</span>
        </li>
      ))}
    </ol>
  );
}
