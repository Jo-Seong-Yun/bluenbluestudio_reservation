"use client";

import { useTransition } from "react";
import { deleteActivityLogEntry } from "@/app/admin/actions";
import type { ActivityLogEntry } from "@/lib/product-analytics";

const CONFIRM_MESSAGE: Partial<Record<ActivityLogEntry["kind"], string>> = {
  reservation:
    '이 예약을 완전히 삭제하시겠습니까? 예약관리의 "완전 삭제"와 똑같이 예약 자체가 지워지며(구글시트·캘린더 동기화 포함) 되돌릴 수 없습니다.',
};

/**
 * 상세 로그 한 줄을 삭제한다 — 이메일 규칙 삭제(delete-rule-button.tsx)와
 * 같은 "기본" 삭제 방식(누르면 confirm() 한 번)을 쓴다. 실제 행을
 * 지우므로(리셋과 달리 되돌릴 수 없다) 위쪽 집계 숫자들도 다음에 이
 * 화면을 새로고침하면 이 기록이 빠진 채로 다시 계산된다.
 */
export function ActivityDeleteButton({
  kind,
  id,
}: {
  kind: ActivityLogEntry["kind"];
  id: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const message =
      CONFIRM_MESSAGE[kind] ??
      "이 기록을 삭제하시겠습니까? 삭제하면 위쪽 집계 숫자에서도 이 기록이 빠지며 되돌릴 수 없습니다.";
    if (!confirm(message)) return;

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteActivityLogEntry(formData);
      if (result?.error) {
        alert(`삭제하지 못했습니다: ${result.error}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-muted shrink-0 text-xs hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      {isPending ? "삭제 중" : "삭제"}
    </button>
  );
}
