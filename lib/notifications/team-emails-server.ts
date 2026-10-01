import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** 예약에 저장된 팀원 이메일. 손님 화면(조회·취소)처럼 RLS로 예약을 못
 * 읽는 경로에서도 자동 메일에 팀원을 넣을 수 있도록 관리자 권한으로 읽는다. */
export async function getReservationTeamEmails(
  reservationId: string,
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reservations")
    .select("team_emails")
    .eq("id", reservationId)
    .maybeSingle();
  return data?.team_emails ?? [];
}
