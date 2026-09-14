"use client";

import { useActionState } from "react";
import {
  uploadCustomersToSheet,
  type UploadCustomersState,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: UploadCustomersState = { status: "idle" };

/**
 * 고객DB 화면에서 손님 정보를 수기로 고친 뒤 누르는 버튼. 예약이
 * 바뀔 때만 자동으로 시트에 반영되니, 예약과 무관하게 이름·성별
 * 같은 정보만 고쳤을 땐 이 버튼을 눌러야 구글 시트가 바로 최신
 * 값으로 맞춰진다.
 */
export function UploadToSheetButton() {
  const [state, action] = useActionState(uploadCustomersToSheet, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <SubmitButton variant="ghost">고객정보 업로드</SubmitButton>
      </form>
      {state.status === "success" ? (
        <p className="text-xs text-green-700 dark:text-green-400">
          {state.count}명을 구글 시트에 반영했습니다.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-xs text-red-700 dark:text-red-400">{state.error}</p>
      ) : null}
    </div>
  );
}
