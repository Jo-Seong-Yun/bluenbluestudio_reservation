"use client";

import { useActionState, useState } from "react";
import {
  lookupReservationsByPhone,
  cancelReservation,
  type PhoneLookupState,
  type PhoneReservation,
  type LookupState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialPhoneState: PhoneLookupState = { status: "idle" };
const initialCancelState: LookupState = { status: "idle" };

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨 (확정 대기)",
  confirmed: "확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼 처리됨",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} ${d.toLocaleTimeString(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )}`;
}

export function LookupForm() {
  const [lookupState, lookupAction, lookupPending] = useActionState(
    lookupReservationsByPhone,
    initialPhoneState,
  );

  // 조회 결과를 별도 상태로 들고 있는다 — 취소 성공 시 그 한 건의 상태만
  // 바로 바꿔서 보여줘야 해서(전체를 다시 조회하지 않고).
  const [list, setList] = useState<PhoneReservation[] | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // 렌더링 중 상태 조정: lookupState가 새로 바뀐 시점에만(effect 없이) 한 번
  // list/phone에 옮겨 담는다. useEffect로 하면 렌더 한 번을 더 쓰게 되고,
  // React 자체가 이 경우엔 렌더링 중 조정을 권장한다.
  const [handledLookupState, setHandledLookupState] = useState(lookupState);
  if (lookupState !== handledLookupState) {
    setHandledLookupState(lookupState);
    if (lookupState.status === "found") {
      setList(lookupState.reservations);
      setPhone(lookupState.phone);
    }
  }

  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (_prev: LookupState, formData: FormData) => {
      const result = await cancelReservation(_prev, formData);
      if (
        result.status === "found" &&
        result.reservation.status === "cancelled"
      ) {
        setList((prev) =>
          prev
            ? prev.map((item) =>
                item.code === result.reservation.code
                  ? { ...item, status: "cancelled" }
                  : item,
              )
            : prev,
        );
      }
      return result;
    },
    initialCancelState,
  );

  if (list) {
    return (
      <div>
        <ul className="space-y-3">
          {list.map((reservation) => {
            const cancellable =
              reservation.status === "requested" ||
              reservation.status === "confirmed";
            const isOpen = selectedCode === reservation.code;

            return (
              <li
                key={reservation.code}
                className="border-border bg-surface rounded-xl border p-4"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCode(isOpen ? null : reservation.code)
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="font-medium">{reservation.productName}</p>
                    <p className="text-muted mt-0.5 text-sm">
                      {formatDateTime(reservation.shootStart)}
                    </p>
                  </div>
                  <span className="text-muted shrink-0 text-xs">
                    {STATUS_LABEL[reservation.status] ?? reservation.status}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-border mt-3 border-t pt-3">
                    <p className="text-muted text-sm">
                      예약번호{" "}
                      <span className="font-mono">{reservation.code}</span>
                    </p>
                    {cancellable ? (
                      <form action={cancelAction} className="mt-3">
                        <input
                          type="hidden"
                          name="code"
                          value={reservation.code}
                        />
                        <input type="hidden" name="phone" value={phone} />
                        <Button
                          variant="danger"
                          type="submit"
                          disabled={cancelPending}
                        >
                          {cancelPending ? "취소하는 중…" : "이 예약 취소하기"}
                        </Button>

                        {/* 이 예약에 대한 취소 시도 결과만 여기 보여준다.
                            성공(=상태가 cancelled로 바뀜)이면 위쪽 분기가
                            "이미 취소된 예약이에요"로 자동으로 바뀌므로
                            여기서는 실패한 경우만 신경 쓰면 된다. */}
                        <div className="mt-2">
                          {cancelState.status === "error" ? (
                            <ErrorText>{cancelState.error}</ErrorText>
                          ) : null}
                          {cancelState.status === "found" &&
                          cancelState.reservation.code === reservation.code &&
                          cancelState.reservation.status !== "cancelled" ? (
                            <ErrorText>
                              취소 기한이 지났거나 이미 처리된 예약이라 취소할
                              수 없어요. 스튜디오로 문의해주세요.
                            </ErrorText>
                          ) : null}
                        </div>
                      </form>
                    ) : reservation.status === "cancelled" ? (
                      <p className="text-muted mt-2 text-sm">
                        이미 취소된 예약이에요.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            setList(null);
            setSelectedCode(null);
          }}
          className="text-muted mt-6 text-sm hover:underline"
        >
          ← 다른 번호로 다시 조회
        </button>
      </div>
    );
  }

  return (
    <form action={lookupAction} className="space-y-4">
      <Field label="연락처" hint="예약하실 때 입력하신 번호예요.">
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="01012345678"
          required
          className={inputClass}
        />
      </Field>

      <ErrorText>
        {lookupState.status === "error" ? lookupState.error : null}
      </ErrorText>

      <Button type="submit" disabled={lookupPending} className="w-full">
        {lookupPending ? "조회 중…" : "조회하기"}
      </Button>
    </form>
  );
}
