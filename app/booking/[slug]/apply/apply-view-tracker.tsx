"use client";

import { useEffect, useRef } from "react";
import { logApplyView } from "@/lib/booking/actions";
import { captureRefFromUrl, readRefCookie } from "@/lib/booking/ref-cookie";

/**
 * 화면에 보이는 게 없는 순수 기록용 컴포넌트. 신청서 작성 화면이
 * 마운트되는 순간(=손님이 날짜·시간 선택을 마치고 여기까지 왔다는
 * 확실한 신호) 딱 한 번 기록한다. 자세한 이유는
 * lib/booking/actions.ts의 logApplyView 참고.
 */
export function ApplyViewTracker({ productId }: { productId: string }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    captureRefFromUrl();
    void logApplyView(productId, readRefCookie());
  }, [productId]);

  return null;
}
