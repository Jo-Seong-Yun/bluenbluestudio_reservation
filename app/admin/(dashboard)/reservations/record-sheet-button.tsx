"use client";

import { Button } from "@/components/ui";

/**
 * "촬영 기록표"(예약 정보로 자동 채운 서명지) 버튼. 한 번 누르면 두 가지가
 * 동시에 일어난다 — (1) 인쇄용 미리보기를 새 탭으로 열어 인쇄 대화상자를
 * 바로 띄우고, (2) 같은 내용을 담은 진짜 .docx 파일을 다운로드한다.
 * 브라우저 보안 정책상 클릭 한 번 없이 완전히 조용하게 프린터로 바로
 * 보낼 방법은 없어서, "버튼 1번 → 인쇄 대화상자"가 가장 가까운 자동화다.
 */
export function RecordSheetButton({
  reservationId,
}: {
  reservationId: string;
}) {
  function handleClick() {
    window.open(
      `/admin/reservations/${reservationId}/record-sheet/print`,
      "_blank",
    );
    const link = document.createElement("a");
    link.href = `/admin/reservations/${reservationId}/record-sheet`;
    link.click();
  }

  return (
    <Button type="button" variant="ghost" onClick={handleClick}>
      기록표 생성
    </Button>
  );
}
