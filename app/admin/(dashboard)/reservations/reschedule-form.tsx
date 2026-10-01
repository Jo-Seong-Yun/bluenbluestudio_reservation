"use client";

import { useActionState, useEffect, useState } from "react";
import {
  loadReservationRecipientInfo,
  rescheduleReservation,
  type ActionState,
  type ReservationRecipientInfo,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { TeamRecipientsField } from "@/components/team-recipients-field";
import { initialTeamEmailRows } from "@/lib/notifications/team-emails";

/**
 * 확정된 예약의 날짜·시간을 관리자가 직접 바꾼다. 운영시간·리드타임
 * 확인 없이 원하는 대로 입력할 수 있고, 다른 예약과 실제로 겹치면
 * 서버(rescheduleReservation)가 그때 거절한다 — 그 에러만 보여준다.
 * 성공하면 손님(과 아래에 적은 팀원)에게 "일정 변경" 안내가 자동으로 나간다.
 */
export function RescheduleForm({
  reservationId,
  currentDate,
  currentTime,
}: {
  reservationId: string;
  /** "YYYY-MM-DD" — 날짜 입력칸의 기본값. */
  currentDate: string;
  /** "HH:MM" — 시간 입력칸의 기본값. */
  currentTime: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    rescheduleReservation,
    null,
  );
  useReportPending(pending);

  const [recipientInfo, setRecipientInfo] =
    useState<ReservationRecipientInfo | null>(null);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadReservationRecipientInfo(reservationId).then((info) => {
      if (cancelled) return;
      setRecipientInfo(info);
      setTeamEmails(initialTeamEmailRows(info.teamEmails, info.productMaxPeople));
    });
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  return (
    <form action={action} className="border-border mt-4 border-t pt-4">
      <input type="hidden" name="id" value={reservationId} />
      <p className="mb-2 text-sm font-medium">일정 변경</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          name="date"
          defaultValue={currentDate}
          required
          className={inputClass}
        />
        <input
          type="time"
          name="time"
          defaultValue={currentTime}
          required
          className={inputClass}
        />
      </div>
      {recipientInfo ? (
        <div className="mt-3">
          <TeamRecipientsField
            customerEmail={recipientInfo.reservationEmail}
            value={teamEmails}
            onChange={setTeamEmails}
            note="변경하면 위 사람들에게 일정 변경 안내 메일이 각각 따로 나갑니다."
          />
        </div>
      ) : null}
      <Button
        type="submit"
        variant="ghost"
        disabled={pending}
        className="mt-2 w-full"
      >
        {pending ? "변경 중…" : "변경"}
      </Button>
      <ErrorText>{state?.error ?? null}</ErrorText>
    </form>
  );
}
