"use client";

import { useActionState } from "react";
import {
  uploadReservationsToSheet,
  type UploadReservationsState,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: UploadReservationsState = { status: "idle" };

/**
 * 예약관리 화면에서 시트가 꼬였다 싶을 때 누르는 버튼. 예약이 바뀔
 * 때마다 자동으로 "예약" 탭에 반영되지만, 시트를 손으로 건드렸거나
 * 동기화가 놓친 게 있을 때 지금 DB 상태 그대로 통째로 다시 맞춘다.
 */
export function UploadToSheetButton() {
  const [state, action] = useActionState(uploadReservationsToSheet, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <SubmitButton variant="ghost">예약정보 업로드</SubmitButton>
      </form>
      {state.status === "success" ? (
        <p className="text-xs text-green-700 dark:text-green-400">
          예약 {state.count}건을 구글 시트에 반영했습니다.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-xs text-red-700 dark:text-red-400">{state.error}</p>
      ) : null}
    </div>
  );
}
