"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  deleteCustomers,
  type DeleteCustomersState,
} from "@/app/admin/actions";
import { Button, ErrorText } from "@/components/ui";

const CONFIRM_WORD = "삭제";
const initialState: DeleteCustomersState = { status: "idle" };

/**
 * 고객DB 목록에서 체크박스로 고른 손님들을 한 번에 지운다. 각 행마다
 * 따로 삭제 버튼을 두지 않고, 이미 있는 선택(체크박스) 기능을 그대로
 * 이어받아 "선택된 것 전체"를 지우는 방식으로만 만든다.
 *
 * 예약 삭제(delete-reservation-button.tsx)와 같은 2단계 확인을 쓴다 —
 * 개인정보를 완전히 지우는 되돌릴 수 없는 작업이라, 실수로 누르는 걸
 * 막으려는 목적이다.
 */
export function DeleteCustomersButton({
  phones,
  onDeleted,
}: {
  phones: string[];
  onDeleted: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"ask" | "confirm">("ask");
  const [typed, setTyped] = useState("");
  const [state, action] = useActionState(deleteCustomers, initialState);

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
      onDeleted();
    }
  }, [state, onDeleted]);

  function open() {
    setStep("ask");
    setTyped("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={open}
        disabled={phones.length === 0}
        className="text-xs"
      >
        선택 삭제 ({phones.length})
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => setStep("ask")}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5 backdrop:bg-black/50"
      >
        {step === "ask" ? (
          <>
            <p className="font-bold">정말 삭제하시겠습니까?</p>
            <p className="text-muted mt-2 text-sm">
              선택한 {phones.length}명의 고객 정보가 고객DB에서 완전히
              사라지며, 되돌릴 수 없습니다. 이미 접수된 예약 기록 자체는
              그대로 남습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                아니오
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setStep("confirm")}
              >
                예
              </Button>
            </div>
          </>
        ) : (
          <form action={action}>
            {phones.map((phone) => (
              <input key={phone} type="hidden" name="phones" value={phone} />
            ))}

            <p className="font-bold">마지막 확인입니다</p>
            <p className="text-muted mt-2 text-sm">
              아래 칸에 <span className="text-foreground font-bold">삭제</span>
              를 정확히 입력해야 삭제 버튼이 활성화됩니다.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="삭제"
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            />
            {state.status === "error" ? (
              <ErrorText>{state.error}</ErrorText>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                취소
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={typed !== CONFIRM_WORD}
              >
                삭제하기
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
