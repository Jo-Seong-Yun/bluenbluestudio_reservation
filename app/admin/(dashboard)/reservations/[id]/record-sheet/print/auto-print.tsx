"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * 페이지가 열리자마자 인쇄 대화상자를 띄운다. 일부 브라우저는 새 창이
 * 뜨자마자(사용자 클릭 없이) 스크립트로 인쇄를 여는 걸 막을 수 있어,
 * 그런 경우를 대비해 눈에 보이는 "인쇄" 버튼도 같이 둔다 — 화면에는
 * 보이지만 종이/PDF 인쇄 결과에는 안 나오게 print:hidden 처리한다.
 */
export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="print:hidden">
      <Button type="button" onClick={() => window.print()}>
        인쇄
      </Button>
      <p className="text-muted mt-2 text-sm">
        인쇄 대화상자가 자동으로 뜨지 않으면 위 버튼을 눌러 주시기 바랍니다.
      </p>
    </div>
  );
}
