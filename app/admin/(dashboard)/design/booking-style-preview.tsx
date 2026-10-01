"use client";
import type { CSSProperties } from "react";
import { BookingProductCard } from "@/components/booking-products";
import type { BookingStyle } from "@/lib/booking-style";
import "@/app/booking/booking.css";
/** 실제 예약 목록의 카드를 재사용해 디자인 변경을 같은 구조로 확인한다. */
export function BookingStylePreview({ style }: { style: BookingStyle }) {
  return (
    <div>
      <p className="text-muted mb-2 text-xs font-medium">손님 화면 미리보기</p>
      <div
        className="booking-workspace rounded-md p-4"
        style={
          {
            "--brand": style.accentColor,
            "--booking-text": style.textColor,
          } as CSSProperties
        }
        inert
      >
        <ul>
          <BookingProductCard
            product={{
              id: "preview",
              slug: "preview",
              name: "독백 연기영상",
              summary: "오디션에 사용할 독백 연기를 선명한 영상으로 담습니다.",
              price: 100000,
              sale_price: 80000,
              duration_min: 60,
              max_people: 1,
              imageUrl: null,
            }}
            style={style}
            showThumbnails
          />
        </ul>
      </div>
    </div>
  );
}
