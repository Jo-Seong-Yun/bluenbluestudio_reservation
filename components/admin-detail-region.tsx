"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 작은 화면에서는 표 아래에 펼쳐지는 상세 패널을 선택 즉시 보여준다. */
export function AdminDetailRegion({
  reservationId,
  children,
}: {
  reservationId: string;
  children: ReactNode;
}) {
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 95.99rem)").matches) {
      region.current?.scrollIntoView({ block: "start" });
    }
  }, [reservationId]);
  return (
    <aside ref={region} aria-label="선택한 예약 상세" className="scroll-mt-20">
      {children}
    </aside>
  );
}
