"use client";

import { Button } from "@/components/ui";

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
  }

  return (
    <Button type="button" variant="ghost" onClick={handleClick}>
      기록표 생성
    </Button>
  );
}
