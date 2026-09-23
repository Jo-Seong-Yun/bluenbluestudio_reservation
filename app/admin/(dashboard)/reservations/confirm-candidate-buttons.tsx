"use client";

import {
  cancelReservationWithReason,
  confirmReservationCandidate,
} from "@/app/admin/actions";
import { kstDateString, kstTimeString, weekdayOf } from "@/lib/time";
import { StatusTransitionModal } from "./status-transition-modal";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatCandidateTime(iso: string): string {
  const d = new Date(iso);
  const date = kstDateString(d);
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[weekdayOf(date)];
  return `${month}월 ${day}일(${weekday}) ${kstTimeString(d)}`;
}

/**
 * 손님이 낸 후보(1~3지망) 중 하나를 관리자가 골라 확정한다. 이것도
 * "일정확정"과 같은 결과(schedule_confirmed)라, 다른 상태 변경과 똑같이
 * 확인모달(나갈 이메일 미리보기+수정)을 거친다. 확정 자체는 이 순간에야
 * 비로소 그 시간이 실제로 점유되므로(confirmReservationCandidate 참고),
 * 서버가 "그사이 다른 예약이 먼저 가져갔다"고 거절할 수 있다 — 그
 * 에러를 모달 안에 그대로 보여준다.
 */
export function ConfirmCandidateButtons({
  reservationId,
  candidates,
}: {
  reservationId: string;
  candidates: { rank: number; shootStart: string; shootEnd: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        희망 시간 중 하나를 선택하여 확정해 주십시오
      </p>
      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <StatusTransitionModal
            key={c.rank}
            reservationId={reservationId}
            triggerType="on_schedule_confirmed"
            buttonLabel={`${c.rank}지망 · ${formatCandidateTime(c.shootStart)}로 확정`}
            buttonClassName="w-full justify-start"
            modalTitle="일정확정 확인"
            confirmAction={confirmReservationCandidate}
            extraFields={{ rank: String(c.rank) }}
            extraPreviewVariables={{ 일시: formatCandidateTime(c.shootStart) }}
          />
        ))}
      </div>

      <div className="mt-3">
        <StatusTransitionModal
          reservationId={reservationId}
          triggerType="on_cancelled"
          buttonLabel="이 신청 취소하기"
          buttonVariant="danger"
          buttonClassName="text-xs"
          modalTitle="예약 취소 확인"
          requireReason
          confirmAction={cancelReservationWithReason}
        />
      </div>
    </div>
  );
}
