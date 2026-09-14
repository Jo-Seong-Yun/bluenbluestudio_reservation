"use client";

import { useActionState } from "react";
import {
  backfillGoogleSheets,
  type BackfillGoogleSheetsState,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: BackfillGoogleSheetsState = { status: "idle" };

/**
 * 구글 시트 연동을 붙이기 전부터 있던 예약들을 한 번에 소급 반영하는
 * 버튼. 평소엔 예약이 바뀔 때마다 자동으로 시트에 반영되지만, 그건
 * 앞으로 생기는 변화에만 적용되니 기존 예약은 이 버튼을 한 번 눌러야
 * 시트에 나타난다. 덮어쓰기 방식이라 몇 번을 눌러도 결과는 같다 —
 * 나중에 시트가 꼬였다 싶을 때 다시 눌러 강제로 맞춰볼 수도 있다.
 */
export function GoogleSheetsBackfillSection() {
  const [state, action] = useActionState(backfillGoogleSheets, initialState);

  return (
    <section className="border-border border-t pt-6">
      <h2 className="font-bold">구글 시트 소급 반영</h2>
      <p className="text-muted mt-1 text-xs">
        연동을 붙이기 전부터 있던 예약은 자동으로 시트에 올라가지
        않습니다. 아래 버튼을 한 번 눌러 지금까지의 모든 예약을 “예약”·
        “고객DB” 탭에 한 번에 반영해 주시기 바랍니다(구글 시트 환경변수가
        설정돼 있어야 합니다).
      </p>
      <form action={action} className="mt-3">
        <SubmitButton variant="ghost">지금까지의 예약 모두 반영</SubmitButton>
      </form>
      {state.status === "success" ? (
        <p className="mt-2 text-sm text-green-700 dark:text-green-400">
          예약 {state.reservationCount}건, 고객 {state.customerCount}명을
          시트에 반영했습니다.
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
