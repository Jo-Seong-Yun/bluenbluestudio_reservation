"use client";

import { useEffect, useRef } from "react";
import { logBookingListView } from "@/lib/booking/actions";
import { captureRefFromUrl, readRefCookie } from "@/lib/booking/ref-cookie";

/**
 * 화면에 보이는 게 없는 순수 기록용 컴포넌트. 상품 목록 화면이
 * 마운트되는 순간(=손님이 실제로 목록을 본 순간) 딱 한 번 기록한다.
 * 자세한 이유는 lib/booking/actions.ts의 logBookingListView 참고.
 */
export function BookingListViewTracker() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    captureRefFromUrl();
    void logBookingListView(readRefCookie());
  }, []);

  return null;
}
