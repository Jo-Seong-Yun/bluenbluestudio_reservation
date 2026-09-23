"use client";

import {
  applyReservationTransition,
  cancelReservationWithReason,
  revertReservationStatus,
} from "@/app/admin/actions";
import { PendingSubmit } from "@/components/submit-button";
import { StatusTransitionModal } from "./status-transition-modal";

/**
 * 상태 변경 버튼. 예전엔 5개 버튼이 한 번에 다 보이고 눌리는 즉시
 * 상태가 바뀌었는데, 버튼 하나로 손님에게 메일이 나가는 거라 너무
 * 가볍다는 지적을 받아들여 — 지금 상태에서 다음 단계로 갈 수 있는
 * 버튼만 보여주고(requested→일정확정, 일정확정→입금확인,
 * 입금확인→완료|노쇼), 어느 버튼을 누르든 확인모달(나갈 이메일
 * 미리보기+수정)을 거친 뒤에야 실제로 바뀐다. 완료·노쇼는 버튼이 모두
 * 사라지고 라벨+되돌리기 링크만 남는다. 취소는 어느 단계에서든 가능하되
 * 사유를 반드시 입력해야 하고, 취소된 예약은 휴지통으로 빠져 이 화면엔
 * 더 이상 안 나온다(reservations/page.tsx가 걸러낸다).
 */
export function StatusButtons({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  if (status === "completed" || status === "no_show") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {status === "completed" ? "촬영완료" : "노쇼"}
        </span>
        <form action={revertReservationStatus}>
          <input type="hidden" name="id" value={reservationId} />
          <PendingSubmit className="text-muted hover:text-foreground text-xs underline">
            되돌리기
          </PendingSubmit>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "requested" ? (
        <StatusTransitionModal
          reservationId={reservationId}
          triggerType="on_schedule_confirmed"
          buttonLabel="일정확정"
          modalTitle="일정확정 확인"
          confirmAction={applyReservationTransition}
          extraFields={{ nextStatus: "schedule_confirmed" }}
        />
      ) : null}

      {status === "schedule_confirmed" ? (
        <StatusTransitionModal
          reservationId={reservationId}
          triggerType="on_payment_confirmed"
          buttonLabel="입금확인/예약확정"
          modalTitle="입금확인/예약확정 확인"
          confirmAction={applyReservationTransition}
          extraFields={{ nextStatus: "payment_confirmed" }}
        />
      ) : null}

      {status === "payment_confirmed" ? (
        <>
          <StatusTransitionModal
            reservationId={reservationId}
            triggerType="on_completed"
            buttonLabel="완료"
            modalTitle="완료 처리 확인"
            confirmAction={applyReservationTransition}
            extraFields={{ nextStatus: "completed" }}
          />
          <StatusTransitionModal
            reservationId={reservationId}
            triggerType="on_no_show"
            buttonLabel="노쇼"
            modalTitle="노쇼 처리 확인"
            confirmAction={applyReservationTransition}
            extraFields={{ nextStatus: "no_show" }}
          />
        </>
      ) : null}

      <StatusTransitionModal
        reservationId={reservationId}
        triggerType="on_cancelled"
        buttonLabel="취소"
        buttonVariant="danger"
        modalTitle="예약 취소 확인"
        requireReason
        confirmAction={cancelReservationWithReason}
      />
    </div>
  );
}
