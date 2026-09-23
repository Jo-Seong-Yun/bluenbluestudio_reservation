"use client";

import {
  cardPaddingClass,
  cardRadiusClass,
  nameTextClass,
  priceTextClass,
  saleBadgeBackground,
  thumbnailSizeClass,
  type BookingStyle,
} from "@/lib/booking-style";

/**
 * "예약 페이지 디자인" 섹션 옆에서, 지금 고른 색·크기·모서리가 손님
 * 화면(app/booking/page.tsx)에서 실제로 어떻게 보이는지 바로 보여준다.
 * 카드 마크업 자체는 그 파일의 상품 카드 하나를 그대로 옮겨온 것이다
 * — 여기 예시 상품(가격·할인율)만 미리보기용 더미 값이다.
 */
export function BookingStylePreview({ style }: { style: BookingStyle }) {
  const radiusClass = cardRadiusClass(style.cardRadius);
  const paddingClass = cardPaddingClass(style.cardSize);
  const thumbClass = thumbnailSizeClass(style.cardSize);
  const nameClass = nameTextClass(style.textSize);
  const priceClass = priceTextClass(style.textSize);

  return (
    <div>
      <p className="text-muted mb-2 text-xs font-medium">손님 화면 미리보기</p>
      <div
        className={`border-border bg-surface flex items-stretch overflow-hidden border ${radiusClass}`}
      >
        <div className={`flex min-w-0 flex-1 items-center gap-4 ${paddingClass}`}>
          <div className={`bg-surface-subtle shrink-0 rounded-lg ${thumbClass}`} />
          <div className="min-w-0 flex-1">
            <h2 className={`font-bold ${nameClass}`} style={{ color: style.textColor }}>
              독백 연기영상
            </h2>
            <p className="text-muted mt-0.5 line-clamp-2 max-w-[60%] text-xs sm:text-sm">
              실내 독백 연기영상 촬영
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2 text-right">
            <div className="flex flex-col items-end gap-0">
              <div className="flex items-center gap-1.5">
                <span className="text-muted text-xs line-through">100,000원</span>
                <span
                  className="rounded-md px-1 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: saleBadgeBackground(style.saleColor),
                    color: style.saleColor,
                  }}
                >
                  20%
                </span>
              </div>
              <p className={`font-extrabold whitespace-nowrap ${priceClass}`} style={{ color: style.textColor }}>
                80,000원
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap sm:text-sm"
              style={{ color: style.accentColor }}
            >
              예약하기 <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: style.accentColor }}
        >
          이미 예약하셨습니까? 예약 조회 →
        </span>
      </div>
    </div>
  );
}
