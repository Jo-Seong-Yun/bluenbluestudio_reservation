"use client";

import { useActionState, useState } from "react";
import {
  lookupReservation,
  cancelReservation,
  type LookupState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialState: LookupState = { status: "idle" };

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨 (확정 대기)",
  confirmed: "확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼 처리됨",
};

export function LookupForm() {
  // 조회에 성공하면 취소 폼에 다시 넣어줘야 해서 값을 들고 있는다.
  // (DOM에서 다른 폼의 값을 몰래 읽어오는 대신, 상태로 명시적으로 넘긴다)
  const [phone, setPhone] = useState("");

  const [state, action, pending] = useActionState(
    lookupReservation,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelReservation,
    initialState,
  );

  const shown = cancelState.status !== "idle" ? cancelState : state;

  if (shown.status === "found") {
    const { reservation, canCancel } = shown;
    const shootDate = new Date(reservation.shootStart);

    return (
      <div className="border-border bg-surface rounded-xl border p-5">
        <p className="text-2xl font-bold tracking-wide">{reservation.code}</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">예약자</dt>
            <dd>{reservation.customerName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">일시</dt>
            <dd>
              {shootDate.toLocaleDateString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}{" "}
              {shootDate.toLocaleTimeString("ko-KR", {
                timeZone: "Asia/Seoul",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">상태</dt>
            <dd>{STATUS_LABEL[reservation.status] ?? reservation.status}</dd>
          </div>
        </dl>

        {canCancel ? (
          <form action={cancelAction} className="mt-4">
            <input type="hidden" name="code" value={reservation.code} />
            <input type="hidden" name="phone" value={phone} />
            <Button variant="danger" type="submit" disabled={cancelPending}>
              {cancelPending ? "취소하는 중…" : "이 예약 취소하기"}
            </Button>
          </form>
        ) : reservation.status === "cancelled" ? (
          <p className="text-muted mt-4 text-sm">이미 취소된 예약이에요.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="예약번호">
        <input
          name="code"
          required
          placeholder="예: 7K3M9PQR"
          className={`${inputClass} font-mono uppercase`}
        />
      </Field>

      <Field label="연락처">
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="01012345678"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </Field>

      <ErrorText>{state.status === "error" ? state.error : null}</ErrorText>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "조회 중…" : "조회하기"}
      </Button>
    </form>
  );
}
