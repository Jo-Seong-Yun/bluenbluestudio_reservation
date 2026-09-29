"use client";

import { useEffect, useRef } from "react";
import { markAnalyticsSeen } from "@/app/admin/actions";

/**
 * 화면에 보이는 게 없는 순수 기록용 컴포넌트. 통계 화면이 실제로 브라우저에
 * 뜬 시점(=사장님이 지금 화면을 보고 있다는 신호)에 딱 한 번
 * settings.analytics_last_seen_at을 지금 시점으로 남긴다.
 *
 * 서버 컴포넌트 렌더링 중에 바로 기록하지 않는 이유: Next.js의 <Link>
 * prefetch가 관리자 네비게이션에 이 화면 링크가 보이기만 해도 미리
 * 데이터를 당겨올 수 있어, 실제로 열어보지 않았는데도 "확인함"으로
 * 잘못 기록될 위험이 있다. 클라이언트 컴포넌트의 마운트 effect는
 * prefetch로는 실행되지 않고 브라우저에 실제로 렌더링됐을 때만
 * 실행되므로 이 위험이 없다(다른 조회 기록 트래커들과 같은 이유).
 */
export function AnalyticsLastSeenTracker() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void markAnalyticsSeen();
  }, []);

  return null;
}
