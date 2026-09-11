"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { discardDraftProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui";

/**
 * 기본정보 폼(formId)에 저장 안 한 변경이 있는 채로 이 화면을 벗어나려
 * 하면 확인을 받는다. 새로 만든 상품("상품 추가" 직후, 문항편집·상세
 * 설명 에디터가 필요로 하는 id를 미리 만들어 두려고 빈 상품을 바로
 * DB에 저장해 둔 상태 — app/admin/actions.ts의 createDraftProduct)
 * 이든, 원래 있던 상품을 고치는 중이든 상관없이 똑같이 적용된다.
 *
 * "변경이 있다"는 그 폼 안(또는 form="…" 속성으로 밖에서 연결된
 * 손님공개 체크박스처럼)의 input/select/textarea에서 input·change
 * 이벤트가 한 번이라도 나면 그때부터 참으로 본다 — 실제 값이 원래
 * 값으로 되돌아왔는지까지는 안 본다(어차피 결과는 같다: 저장 안 하면
 * 반영 안 됨).
 *
 * 막는 경로는 두 가지다:
 *  1. 화면 안의 링크 클릭(뒤로가기 링크, 상단 메뉴 등) — document에
 *     캡처 단계로 클릭 자체를 막고 직접 만든 모달을 띄운다.
 *  2. 탭 닫기/새로고침 — beforeunload로 막는다. 브라우저 정책상 우리가
 *     만든 모달을 띄울 수 없어(동기적으로만 동작하는 네이티브 확인창
 *     하나만 허용된다) 그 경우만 브라우저 자기 문구를 쓴다.
 *
 * 브라우저 "뒤로가기" 버튼은 일부러 안 막는다 — history.pushState로
 * 흉내 내려 하면(한때 그렇게 시도했었다) Next.js 라우터가 각 히스토리
 * 항목에 자기 라우팅 상태를 실어 두는 것과 충돌해서, 이 화면을 나간
 * 뒤에도 다른 페이지 이동이 이상하게 꼬이는 부작용이 있었다. 그
 * 위험을 감수하느니, 뒤로가기는 막지 않는 대신 화면 안의 나가기
 * 경로(1번)를 확실하게 막는 쪽을 택했다.
 *
 * "저장" 버튼은 <a>가 아니라 1번에 안 걸리고, 저장에 성공하면(항상
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
  const dirtyRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    // document.getElementById(formId).id로 다시 비교하면 안 된다 — 이
    // 폼 안에는 name="id"인 hidden input(product-form.tsx, 상품
    // 수정 시)이 있는데, 폼에 name="id" 컨트롤이 있으면 브라우저가
    // form.id 프로퍼티 접근 자체를 그 컨트롤로 가로채 버린다("form의
    // 이름 붙은 컨트롤이 같은 이름의 폼 프로퍼티를 가린다"는 오래된
    // HTML 동작). 그래서 문자열 비교가 아니라 엘리먼트 자체를
    // 캐싱해서 참조로 비교한다.
    const targetForm = document.getElementById(formId);

    function belongsToTargetForm(target: EventTarget | null): boolean {
      const el = target as
        (HTMLElement & { form?: HTMLFormElement | null }) | null;
      return !!el?.form && el.form === targetForm;
    }

    function onFormChange(event: Event) {
      if (belongsToTargetForm(event.target)) dirtyRef.current = true;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function onClickCapture(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // 외부 링크·앵커는 안 막는다

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingHref(href);
      dialogRef.current?.showModal();
    }

    // input은 타이핑마다, change는 select·checkbox·radio·file처럼
    // input이 안 뜨는 컨트롤을 잡으려고 둘 다 듣는다.
    document.addEventListener("input", onFormChange, true);
    document.addEventListener("change", onFormChange, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("input", onFormChange, true);
      document.removeEventListener("change", onFormChange, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [formId]);

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
    // 저장 안 하고 나가는 것이므로 방금 타이핑한 건 DB에 반영된 적이
    // 없다 — 이 상품이 createDraftProduct가 만들어 둔 그대로(정말
    // 아무 저장도 안 된 상태)라면 목록에 빈 블럭만 남기지 않도록
    // 통째로 지운다. 이미 뭔가 실제로 저장돼 있는 상품이면 조용히
    // 아무 일도 안 한다(discardDraftProduct가 스스로 판단한다).
    const formData = new FormData();
    formData.set("id", productId);
    discardDraftProduct(formData).finally(() => {
      if (pendingHref) router.push(pendingHref);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setPendingHref(null)}
      className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5 backdrop:bg-black/50"
    >
      <p className="font-bold">아직 저장하지 않았습니다</p>
      <p className="text-muted mt-2 text-sm">
        지금 나가면 이 상품이 저장되지 않을 수 있습니다. 어떻게 하시겠습니까?
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
