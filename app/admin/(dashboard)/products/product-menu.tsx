"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteProduct,
  duplicateProduct,
  type ProductDeleteState,
} from "../../actions";
import { Button } from "@/components/ui";
import { PendingSubmit } from "@/components/submit-button";
import { useReportPending } from "@/components/pending-overlay";

const CONFIRM_WORD = "삭제";

/**
 * 카드 우상단의 점 세 개 메뉴. "복제"와 "삭제"가 있다.
 *
 * 복제는 되돌리기 쉬운(그냥 지우면 되는) 동작이라 확인 절차 없이 바로
 * 실행된다. 삭제는 예약 삭제(delete-reservation-button.tsx)와 같은
 * 2단계 확인을 거친다 — 실수로 지우는 걸 막기 위해서다. 예약 내역이
 * 있는 상품은 DB 외래키 제약 때문에 애초에 지워지지 않고, deleteProduct가
 * 그 경우를 안내 문구로 바꿔 돌려준다.
 */
export function ProductMenu({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"ask" | "confirm">("ask");
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<ProductDeleteState, FormData>(
    deleteProduct,
    null,
  );
  useReportPending(pending);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (state?.success) dialogRef.current?.close();
  }, [state]);

  function openDialog() {
    setMenuOpen(false);
    setStep("ask");
    setTyped("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="메뉴 열기"
        aria-expanded={menuOpen}
        className="text-muted hover:bg-surface-subtle hover:text-foreground flex h-6 w-6 items-center justify-center rounded"
      >
        ⋮
      </button>

      {menuOpen ? (
        <div className="border-border bg-surface absolute top-7 right-0 z-10 w-28 rounded-lg border py-1 shadow-lg">
          <form action={duplicateProduct} onSubmit={() => setMenuOpen(false)}>
            <input type="hidden" name="id" value={productId} />
            <PendingSubmit className="hover:bg-surface-subtle block w-full px-3 py-2 text-left text-sm">
              복제
            </PendingSubmit>
          </form>
          <button
            type="button"
            onClick={openDialog}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            삭제
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setStep("ask")}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5 backdrop:bg-black/50"
      >
        {step === "ask" ? (
          <>
            <p className="font-bold">&quot;{productName}&quot; 삭제하시겠습니까?</p>
            <p className="text-muted mt-2 text-sm">
              상품 정보와 신청서 문항이 모두 사라지며 되돌릴 수 없습니다. 예약
              내역이 있는 상품은 삭제할 수 없습니다 — 대신 비공개로 전환해
              주시기 바랍니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>
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
            <input type="hidden" name="id" value={productId} />

            <p className="font-bold">마지막 확인입니다</p>
            <p className="text-muted mt-2 text-sm">
              아래 칸에 <span className="text-foreground font-bold">삭제</span>
              를 정확히 입력해야 삭제 버튼이 활성화됩니다.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="삭제"
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            />
            {state?.error ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {state.error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                취소
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={typed !== CONFIRM_WORD || pending}
              >
                {pending ? "삭제 중…" : "삭제하기"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
