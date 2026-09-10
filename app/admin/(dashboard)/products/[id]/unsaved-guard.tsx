"use client";

import { useEffect } from "react";

const MESSAGE =
  "저장하지 않았어요. 지금 나가면 이 상품이 저장되지 않아요. 정말 나가시겠어요?";

/**
 * "상품 추가"로 막 만들어진 새 상품(아직 한 번도 저장 안 한 상태)에서
 * 벗어나려 할 때 확인을 받는다. "상품 추가"는 문항편집·상세설명
 * 에디터가 필요로 하는 id를 미리 만들어 두려고 빈 상품을 바로 DB에
 * 저장하는데(app/admin/actions.ts의 createDraftProduct), 그 상태에서
 * 아무것도 안 누르고 나가버리면 "새 상품"이라는 빈 상품이 목록에 그대로
 * 남는다 — 그걸 나가기 전에 알아채도록 한다.
 *
 * 탭 닫기/새로고침은 beforeunload로 막는다(브라우저가 이 문구를 그대로
 * 보여주지 않고 자기 문구를 쓴다 — 최신 브라우저 공통 정책이라 우리가
 * 바꿀 수 없다). 이 화면 안의 링크 클릭(뒤로가기, 상단 메뉴 등)은
 * document에 캡처 단계로 클릭을 가로채 우리 문구로 직접 확인받는다.
 * "저장" 버튼은 <a>가 아니라 <button type="submit">이라 안 걸리고,
 * 저장에 성공하면 이 컴포넌트째로 사라지므로 더 감시할 필요가 없다.
 */
export function UnsavedGuard() {
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onClickCapture(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // 외부 링크·앵커는 안 막는다

      if (!confirm(MESSAGE)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
