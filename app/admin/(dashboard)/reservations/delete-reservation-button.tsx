"use client";

import { useRef, useState } from "react";
import { deleteReservation } from "@/app/admin/actions";
import { Button } from "@/components/ui";

const CONFIRM_WORD = "삭제";

/**
 * 예약 완전 삭제 버튼. 2중 확인을 거친다.
 *
 *   1단계: "정말 삭제하시겠습니까?" — 예/아니오
 *   2단계: "삭제"를 정확히 입력해야 삭제 버튼이 눌린다
 *
 * 입력 검증은 여기 클라이언트에서만 한다. 실수로 잘못 누르는 걸
 * 막으려는 목적이지 보안 경계가 아니라서다 — 실제 권한 확인은
 * 서버 액션(requireAdmin)이 한다.
 */
export function DeleteReservationButton({
  id,
  month,
  date,
}: {
  id: string;
  month: string;
  date: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"ask" | "confirm">("ask");
  const [typed, setTyped] = useState("");

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
        className="border-red-300 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        예약 삭제
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
              이 예약은 관리자·손님 화면 양쪽에서 완전히 사라지고, 되돌릴 수
              없어요. 그냥 취소 처리만 하려면 위의 &quot;취소&quot; 버튼을
              쓰세요.
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
          <form action={deleteReservation}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="date" value={date} />

            <p className="font-bold">마지막 확인이에요</p>
            <p className="text-muted mt-2 text-sm">
              아래 칸에 <span className="text-foreground font-bold">삭제</span>
              를 정확히 입력하면 삭제 버튼이 눌려요.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="삭제"
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            />
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
