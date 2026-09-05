"use client";

import { useActionState, useRef } from "react";
import {
  createManualReservation,
  type ManualReservationState,
} from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialState: ManualReservationState = { status: "idle" };

/**
 * 전화·DM으로 받은 예약을 관리자가 직접 넣는 버튼 + 다이얼로그.
 *
 * 시간은 슬롯 버튼이 아니라 직접 입력받는다 — 전화로 이미 몇 시인지
 * 정해진 상태로 여기 들어오는 것이라, 손님 화면처럼 빈 시간을 눈으로
 * 골라야 할 이유가 없다. 대신 서버에서 그 시간이 실제로 열려 있는지
 * 다시 계산해 확인하고, 아니면 에러로 알려준다.
 */
export function ManualReservationButton({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    createManualReservation,
    initialState,
  );

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    formRef.current?.reset();
    dialogRef.current?.close();
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={open}>
        수기 예약 등록
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-5 backdrop:bg-black/50"
      >
        {state.status === "success" ? (
          <div>
            <p className="font-bold">등록됐어요</p>
            <p className="text-muted mt-2 text-sm">
              예약번호 <span className="font-mono">{state.code}</span>
            </p>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={close}>
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <form ref={formRef} action={action} className="space-y-3">
            <p className="font-bold">수기 예약 등록</p>

            <Field label="상품">
              <select name="productId" required className={inputClass}>
                <option value="">선택해주세요</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex gap-2">
              <div className="flex-1">
                <Field label="날짜">
                  <input
                    type="date"
                    name="date"
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="시간">
                  <input
                    type="time"
                    name="time"
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <Field label="이름">
              <input
                name="customerName"
                required
                maxLength={50}
                className={inputClass}
              />
            </Field>

            <Field label="연락처" hint="숫자만, 010으로 시작">
              <input
                name="customerPhone"
                type="tel"
                inputMode="numeric"
                placeholder="01012345678"
                required
                className={inputClass}
              />
            </Field>

            <Field label="인원 (선택)">
              <input
                name="peopleCount"
                type="number"
                min={1}
                className={inputClass}
              />
            </Field>

            <Field label="메모 (선택)">
              <textarea name="memo" rows={2} className={inputClass} />
            </Field>

            <ErrorText>
              {state.status === "error" ? state.error : null}
            </ErrorText>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={close}>
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "등록 중…" : "등록"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
