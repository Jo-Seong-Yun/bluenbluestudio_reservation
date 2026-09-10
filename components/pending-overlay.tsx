"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LoadingOverlay } from "./loading-overlay";

/**
 * 관리자 화면 전역 "처리 중" 오버레이.
 *
 * 버튼 하나하나가 스스로 흐려지는 것(SubmitButton/PendingSubmit)과 별개로,
 * 화면(헤더 제외)을 잠깐 어둡게 덮고 스피너를 보여준다 — 페이지 이동이
 * 없는 동작(공개 전환, 순서 변경, 메모 저장 등)도 서버 왕복 동안 "뭔가
 * 진행 중"이라는 걸 눈에 띄게 보여주기 위해서다. 동시에 여러 버튼이
 * 눌릴 수도 있어 개수를 센다 — 하나가 끝나도 다른 하나가 남아있으면
 * 계속 떠 있어야 한다.
 */
const PendingOverlayContext = createContext<{
  count: number;
  increment: () => void;
  decrement: () => void;
} | null>(null);

export function PendingOverlayProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <PendingOverlayContext.Provider value={{ count, increment, decrement }}>
      {children}
    </PendingOverlayContext.Provider>
  );
}

/**
 * pending 상태를 가진 아무 컴포넌트에서나 불러 전역 오버레이에 보고한다.
 * useFormStatus/useActionState가 돌려주는 pending을 그대로 넘기면 된다.
 * Provider 밖에서 불러도(예: 로그인 화면) 조용히 아무 일도 하지 않는다.
 */
export function useReportPending(pending: boolean) {
  const ctx = useContext(PendingOverlayContext);

  useEffect(() => {
    if (!pending || !ctx) return;
    ctx.increment();
    return () => ctx.decrement();
  }, [pending, ctx]);
}

/** main 영역 안(헤더 제외)에 relative 컨테이너의 자식으로 렌더링한다. */
export function PendingOverlay() {
  const ctx = useContext(PendingOverlayContext);
  if (!ctx || ctx.count === 0) return null;

  return <LoadingOverlay />;
}
