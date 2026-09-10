"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { discardDraftProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui";

/**
 * "상품 추가"로 막 만들어진 새 상품(아직 한 번도 저장 안 한 상태)에서
 * 벗어나려 할 때 확인을 받는다. "상품 추가"는 문항편집·상세설명
 * 에디터가 필요로 하는 id를 미리 만들어 두려고 빈 상품을 바로 DB에
 * 저장하는데(app/admin/actions.ts의 createDraftProduct), 그 상태에서
 * 아무것도 안 누르고 나가버리면 "새 상품"이라는 빈 상품이 목록에 그대로
 * 남는다.
 *
 * 탭 닫기/새로고침은 beforeunload로 막는다 — 이건 브라우저 정책상
 * 우리가 만든 팝업을 띄울 수 없어(동기적으로만 동작하는 네이티브
 * 확인창 하나만 허용된다) 브라우저 자기 문구를 그대로 쓴다. 이 화면
 * 안의 링크 클릭(뒤로가기, 상단 메뉴 등)은 document에 캡처 단계로
 * 가로채 직접 만든 모달(취소/저장하고 나가기/저장 안 하고 나가기)을
 * 띄운다. "저장" 버튼은 <a>가 아니라 안 걸리고, 저장에 성공하면(항상
 * 목록으로 리다이렉트) 이 컴포넌트째로 사라지므로 더 감시하지 않는다.
 */
export function UnsavedGuard({
  productId,
  formId,
}: {
  productId: string;
  /** 모달의 "저장하고 나가기"가 그대로 제출할, 기본정보 폼의 id. */
  formId: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClickCapture(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // 외부 링크·앵커는 안 막는다

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingHref(href);
      dialogRef.current?.showModal();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  function cancel() {
    dialogRef.current?.close();
  }

  function saveAndLeave() {
    // 실제 "저장" 버튼과 똑같이 그 폼을 그대로 제출한다. 성공하면
    // saveProduct가 스스로 상품관리로 이동시킨다.
    const form = document.getElementById(formId);
    if (form instanceof HTMLFormElement) form.requestSubmit();
    dialogRef.current?.close();
  }

  function leaveWithoutSaving() {
    if (!pendingHref) return;
    setDiscarding(true);
    const formData = new FormData();
    formData.set("id", productId);
    discardDraftProduct(formData).finally(() => {
      router.push(pendingHref);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setPendingHref(null)}
      className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5 backdrop:bg-black/50"
    >
      <p className="font-bold">아직 저장하지 않았어요</p>
      <p className="text-muted mt-2 text-sm">
        지금 나가면 이 상품이 저장되지 않을 수 있어요. 어떻게 할까요?
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" onClick={saveAndLeave}>
          저장하고 나가기
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={leaveWithoutSaving}
          disabled={discarding}
        >
          {discarding ? "나가는 중…" : "저장 안 하고 나가기"}
        </Button>
        <Button type="button" variant="ghost" onClick={cancel}>
          취소
        </Button>
      </div>
    </dialog>
  );
}
