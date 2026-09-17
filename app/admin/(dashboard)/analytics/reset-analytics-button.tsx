"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  resetAnalytics,
  type ResetAnalyticsState,
} from "@/app/admin/actions";
import { Button, ErrorText } from "@/components/ui";

const CONFIRM_WORD = "리셋";
const initialState: ResetAnalyticsState = { status: "idle" };

/**
 * 통계 화면 전체를 0부터 다시 세게 만드는 버튼. 고객DB 선택 삭제와
 * 같은 2단계 확인(예/아니오 → "리셋" 직접 입력)을 쓴다 — 그동안 쌓인
 * 조회 기록을 전부 지우는 되돌릴 수 없는 작업이라서다. 실제 예약
 * 건수(신청수)는 통계용 기록이 아니라 지워지지 않는다.
 */
export function ResetAnalyticsButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"ask" | "confirm">("ask");
  const [typed, setTyped] = useState("");
  const [state, action] = useActionState(resetAnalytics, initialState);

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
    }
  }, [state]);

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
      <Button type="button" variant="ghost" onClick={open} className="text-xs">
        통계 리셋
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => setStep("ask")}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5 backdrop:bg-black/50"
      >
        {step === "ask" ? (
          <>
            <p className="font-bold">정말 리셋하시겠습니까?</p>
            <p className="text-muted mt-2 text-sm">
              상품 목록 진입·상품 상세 진입 조회 기록이 전부 지워지고
              0부터 다시 집계됩니다. 되돌릴 수 없습니다. 실제 예약(신청수)
              기록은 지워지지 않습니다.
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
            <p className="font-bold">마지막 확인입니다</p>
            <p className="text-muted mt-2 text-sm">
              아래 칸에 <span className="text-foreground font-bold">리셋</span>
              을 정확히 입력해야 리셋 버튼이 활성화됩니다.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="리셋"
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
                리셋하기
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
