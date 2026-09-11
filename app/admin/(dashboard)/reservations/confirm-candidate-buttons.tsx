"use client";

import { useActionState } from "react";
import {
  confirmReservationCandidate,
  updateReservationStatus,
  type ActionState,
} from "@/app/admin/actions";
import { Button, ErrorText } from "@/components/ui";
import { kstDateString, kstTimeString, weekdayOf } from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatCandidateTime(iso: string): string {
  const d = new Date(iso);
  const date = kstDateString(d);
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[weekdayOf(date)];
  return `${month}월 ${day}일(${weekday}) ${kstTimeString(d)}`;
}

/**
 * 손님이 낸 후보(1~3지망) 중 하나를 관리자가 골라 확정한다. 이 순간에야
 * 비로소 그 시간이 실제로 점유되므로(confirmReservationCandidate 참고),
 * 서버가 "그사이 다른 예약이 먼저 가져갔다"고 거절할 수 있다 — 그
 * 에러를 그대로 보여준다.
 */
export function ConfirmCandidateButtons({
  reservationId,
  candidates,
}: {
  reservationId: string;
  candidates: { rank: number; shootStart: string; shootEnd: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    confirmReservationCandidate,
    null,
  );

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        희망 시간 중 하나를 선택하여 확정해 주십시오
      </p>
      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <form key={c.rank} action={action}>
            <input type="hidden" name="id" value={reservationId} />
            <input type="hidden" name="rank" value={c.rank} />
            <Button
              type="submit"
              variant="ghost"
              disabled={pending}
              className="w-full justify-start"
            >
              {c.rank}지망 · {formatCandidateTime(c.shootStart)}로 확정
            </Button>
          </form>
        ))}
      </div>

      <ErrorText>{state?.error ?? null}</ErrorText>

      <form action={updateReservationStatus} className="mt-3">
        <input type="hidden" name="id" value={reservationId} />
        <input type="hidden" name="status" value="cancelled" />
        <Button type="submit" variant="ghost" className="text-xs">
          이 신청 취소하기
        </Button>
      </form>
    </div>
  );
}
