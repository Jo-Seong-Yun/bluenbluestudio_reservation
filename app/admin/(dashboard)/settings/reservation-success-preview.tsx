"use client";

import { ReservationSuccessCard } from "@/components/reservation-success-card";

/** 미리보기에만 쓰는 가짜 예시 값 — 실제 예약 코드/상품/희망시간은 손님마다 달라 예시로만 보여준다. */
const SAMPLE_CODE = "ABC123";
const SAMPLE_PRODUCT_NAME = "프로필 촬영";
const SAMPLE_CANDIDATES = [
  { dateLabel: "2026-09-20", timeLabel: "14:00" },
  { dateLabel: "2026-09-21", timeLabel: "10:00" },
  { dateLabel: "2026-09-22", timeLabel: "16:00" },
];

/**
 * "예약 완료 화면 문구" 섹션에서 지금 입력 중인 값이 손님 화면에서
 * 실제로 어떻게 보이는지 옆에서 바로 보여준다. 손님용 신청서
 * (components/reservation-form.tsx)와 정확히 같은 컴포넌트
 * (ReservationSuccessCard)를 쓰므로, 여기 보이는 모습이 곧 실제
 * 손님이 보는 모습이다.
 */
export function ReservationSuccessPreview({
  successHeading,
  successMessage,
  bankAccount,
  notice,
}: {
  successHeading: string;
  successMessage: string;
  bankAccount: string;
  notice: string;
}) {
  return (
    <div>
      <p className="text-muted mb-2 text-xs font-medium">손님 화면 미리보기</p>
      <ReservationSuccessCard
        successHeading={successHeading}
        successMessage={successMessage}
        code={SAMPLE_CODE}
        productName={SAMPLE_PRODUCT_NAME}
        candidates={SAMPLE_CANDIDATES}
        bankAccount={bankAccount || null}
        notice={notice || null}
        interactive={false}
        animate={false}
      />
    </div>
  );
}
