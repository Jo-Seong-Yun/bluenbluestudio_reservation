"use client";

import { useActionState } from "react";
import {
  backfillGoogleCalendar,
  type BackfillGoogleCalendarState,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: BackfillGoogleCalendarState = { status: "idle" };

/**
 * 구글 캘린더 연동을 붙이기 전부터 있던 예약들을 한 번에 소급 반영하는
 * 버튼. 평소엔 예약이 바뀔 때마다 자동으로 캘린더에 반영되지만, 그건
 * 앞으로 생기는 변화에만 적용되니 기존 예약은 이 버튼을 한 번 눌러야
 * 캘린더에 나타난다. 이미 있는 이벤트는 갱신, 없으면 새로 만드는
 * 방식이라 몇 번을 눌러도 결과는 같다.
 */
export function GoogleCalendarBackfillSection() {
  const [state, action] = useActionState(backfillGoogleCalendar, initialState);

  return (
    <section className="border-border border-t pt-6">
      <h2 className="font-bold">구글 캘린더 소급 반영</h2>
      <p className="text-muted mt-1 text-xs">
        연동을 붙이기 전부터 있던 예약(확정·완료·노쇼 상태이면서 촬영
        일시가 있는 예약만 해당)은 자동으로 캘린더에 올라가지 않습니다.
        아래 버튼을 한 번 눌러 지금까지의 예약을 모두 캘린더에 반영해
        주시기 바랍니다(구글 캘린더 환경변수가 설정돼 있어야 합니다).
      </p>
      <form action={action} className="mt-3">
        <SubmitButton variant="ghost">지금까지의 예약 모두 캘린더에 반영</SubmitButton>
      </form>
      {state.status === "success" ? (
        <p className="mt-2 text-sm text-green-700 dark:text-green-400">
          예약 {state.syncedCount}건을 캘린더에 반영했습니다
          {state.failedCount > 0
            ? ` (${state.failedCount}건 실패 — 잠시 후 다시 눌러보시기 바랍니다)`
            : ""}
          .
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
