"use client";

import { useActionState } from "react";
import {
  restoreCancelledReservation,
  type TransitionActionState,
} from "@/app/admin/actions";
import { ErrorText } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

/**
 * 휴지통(취소된 예약)에서 복원한다. 취소되기 직전 상태로 되돌아가므로
 * 그사이 같은 시간이 다른 예약으로 먼저 확정됐으면 거절될 수 있다 —
 * 그 에러를 보여줘야 해서 SubmitButton 대신 useActionState로 감싼다.
 */
export function RestoreReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const [state, action, pending] = useActionState<
    TransitionActionState,
    FormData
  >(restoreCancelledReservation, null);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={reservationId} />
      <SubmitButton variant="ghost" disabled={pending}>
        {pending ? "복원하는 중…" : "복원"}
      </SubmitButton>
      <div className="mt-2">
        <ErrorText>{state?.error ?? null}</ErrorText>
      </div>
    </form>
  );
}
