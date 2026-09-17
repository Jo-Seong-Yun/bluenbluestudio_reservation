"use client";

import { useState } from "react";

/**
 * 손님이 실제로 들어오는 예약 페이지 주소를 보여주고 복사할 수 있게
 * 한다. 화면에는 상대 경로만 보여준다(서버는 프리뷰·프로덕션마다
 * 도메인이 달라 미리 알 수 없고, 렌더링 시점에 window를 읽으면
 * 서버·클라이언트 결과가 어긋난다) — 실제 복사되는 값은 버튼을 누른
 * 시점에(이벤트 핸들러 안이라 서버 렌더와 무관하다) location.origin을
 * 붙여 완전한 주소로 만든다.
 */
export function ProductLinkCopy({ slug }: { slug: string }) {
  const path = `/booking/${slug}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 드문 브라우저 환경 — 눌러도 조용히 무시된다.
    }
  }

  return (
    <div className="border-border bg-surface-subtle flex items-center gap-2 rounded-lg border px-3 py-1.5">
      <span className="text-muted min-w-0 truncate font-mono text-xs">
        {path}
      </span>
      <button
        type="button"
        onClick={copy}
        className="text-brand hover:text-brand-hover shrink-0 text-xs font-medium"
      >
        {copied ? "복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
