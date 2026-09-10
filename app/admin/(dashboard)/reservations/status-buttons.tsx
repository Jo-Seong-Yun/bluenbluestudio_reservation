"use client";

import { useOptimistic, useTransition } from "react";
import { updateReservationStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui";

const STATUS_BUTTONS = [
  { status: "confirmed", label: "확정" },
  { status: "completed", label: "완료 처리" },
  { status: "no_show", label: "노쇼 처리" },
  { status: "cancelled", label: "취소" },
] as const;

/**
 * 상태 변경 버튼. 서버 응답을 기다리지 않고 눌린 버튼부터 먼저 파란색으로
 * 켠다(useOptimistic) — 예약 하나하나 처리할 때 매번 누르는 버튼이라
 * 지연이 특히 크게 느껴진다. 실제 저장은 뒤에서 이뤄진다.
 */
export function StatusButtons({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  const [, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_state: string, next: string) => next,
  );

  function change(next: string) {
    startTransition(async () => {
      setOptimisticStatus(next);
      const formData = new FormData();
      formData.set("id", reservationId);
      formData.set("status", next);
      await updateReservationStatus(formData);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_BUTTONS.map(({ status: value, label }) => (
        <Button
          key={value}
          type="button"
          variant={optimisticStatus === value ? "primary" : "ghost"}
          aria-pressed={optimisticStatus === value}
          className="text-xs"
          onClick={() => change(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
