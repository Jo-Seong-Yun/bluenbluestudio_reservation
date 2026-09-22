"use client";

import { useEffect, useRef } from "react";
import { logProductView } from "@/lib/booking/actions";
import { captureRefFromUrl, readRefCookie } from "@/lib/booking/ref-cookie";

/**
 * 화면에 보이는 게 없는 순수 기록용 컴포넌트. 이 화면이 마운트되는
 * 순간(=손님이 실제로 상품 상세 페이지를 본 순간) 딱 한 번 조회를
 * 기록한다. 개발 모드의 StrictMode는 effect를 일부러 두 번 실행해
 * 버그를 잡아내는데, 그대로 두면 조회수가 두 배로 찍히니 ref로
 * 한 번만 기록되게 막는다.
 */
export function ProductViewTracker({ productId }: { productId: string }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    captureRefFromUrl();
    void logProductView(productId, readRefCookie());
  }, [productId]);

  return null;
}
