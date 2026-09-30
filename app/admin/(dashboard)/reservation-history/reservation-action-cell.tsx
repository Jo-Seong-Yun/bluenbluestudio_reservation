"use client";

import {
  applyReservationTransition,
  cancelReservationWithReason,
  revertReservationStatus,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusTransitionModal } from "../reservations/status-transition-modal";
import { DeliverableSendModal } from "../reservations/deliverable-send-modal";
import { RestoreReservationButton } from "../reservations/restore-reservation-button";

// 이 열에 들어가는 모든 버튼(상태 전환·결과물 전송·되돌리기·복원)이
// 같은 크기·글자 크기를 쓰도록 한 곳에 모아둔다.
const BUTTON_SIZE_CLASS = "px-3 py-1.5 text-xs";
const CANCEL_BUTTON_CLASS = `${BUTTON_SIZE_CLASS} text-red-600 dark:text-red-400`;

/** 완료·노쇼로 잘못 처리했을 때 입금확인 단계로 되돌리는 버튼. */
function RevertButton({ reservationId }: { reservationId: string }) {
  return (
    <form action={revertReservationStatus}>
      <input type="hidden" name="id" value={reservationId} />
      <SubmitButton variant="ghost" className={BUTTON_SIZE_CLASS}>
        되돌리기
      </SubmitButton>
    </form>
  );
}

/**
 * 예약내역 표의 "상태 변경" 열. 예약관리(달력) 상세 패널의 상태 변경
 * 버튼(status-buttons.tsx)과 같은 흐름 —
 * 접수 → 일정확정 → 입금확인/예약확정 → 완료|노쇼|취소 —
 * 을 표 안에서 바로 처리할 수 있게 하되, 완료 이후로는 이 표만의
 * 흐름이 이어진다: 완료 → 결과물 전송 → 작업종료(텍스트만, 되돌리기는
 * 계속 가능). 취소는 상태 전환 중 어느 단계에서든 가능하다(기존과 동일).
 *
 * 후보(1~3지망)만 낸 채 아직 날짜가 확정되지 않은 예약은 이 열에서
 * 바로 확정할 수 없다 — 여러 후보 중 하나를 골라야 해서 한 번의
 * 클릭으로 끝나지 않으므로, 예약번호를 눌러 상세 패널에서 고르도록
 * 안내만 한다.
 */
export function ReservationActionCell({
  reservationId,
  status,
  isPending,
  deliverableSent,
}: {
  reservationId: string;
  status: string;
  /** 후보만 낸 채 아직 촬영일시가 확정되지 않은 예약이면 true. */
  isPending: boolean;
  /** "결과물 전송"을 이미 한 번 성공적으로 마쳤으면 true. */
  deliverableSent: boolean;
}) {
  if (isPending) {
    return (
      <span className="text-muted text-xs">
        후보 확정 대기 — 예약번호를 눌러 확정
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">작업종료</span>
        <RestoreReservationButton
          reservationId={reservationId}
          buttonClassName={BUTTON_SIZE_CLASS}
        />
      </div>
    );
  }

  if (status === "no_show") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">작업종료</span>
        <RevertButton reservationId={reservationId} />
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {deliverableSent ? (
          <span className="text-sm font-medium">작업종료</span>
        ) : (
          <DeliverableSendModal
            reservationId={reservationId}
            buttonClassName={BUTTON_SIZE_CLASS}
          />
        )}
        <RevertButton reservationId={reservationId} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "requested" ? (
        <StatusTransitionModal
          reservationId={reservationId}
          triggerType="on_schedule_confirmed"
          buttonLabel="일정확정"
          buttonClassName={BUTTON_SIZE_CLASS}
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
          buttonClassName={BUTTON_SIZE_CLASS}
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
            buttonClassName={BUTTON_SIZE_CLASS}
            modalTitle="완료 처리 확인"
            confirmAction={applyReservationTransition}
            extraFields={{ nextStatus: "completed" }}
          />
          <StatusTransitionModal
            reservationId={reservationId}
            triggerType="on_no_show"
            buttonLabel="노쇼"
            buttonClassName={BUTTON_SIZE_CLASS}
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
        buttonVariant="ghost"
        buttonClassName={CANCEL_BUTTON_CLASS}
        modalTitle="예약 취소 확인"
        requireReason
        confirmAction={cancelReservationWithReason}
      />
    </div>
  );
}
