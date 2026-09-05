import "server-only";
import { createAdminClient } from "../supabase/admin";

/**
 * 발송 성공/실패를 notification_logs에 남긴다.
 *
 * 서비스 역할 키를 쓴다 — 손님 예약 흐름(로그인 안 된 상태)에서도
 * 로그를 남겨야 하는데, 그 흐름은 RLS상 이 테이블에 쓸 권한이 없다.
 * 이 함수 자체가 실패해도(DB 순간 장애 등) 알림 발송 자체를 막으면
 * 안 되므로 호출하는 쪽에서 항상 감싸서 부른다.
 */
export async function logNotification(params: {
  channel: "sms" | "email";
  purpose: string;
  recipient: string;
  reservationId?: string | null;
  success: boolean;
  error?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("notification_logs").insert({
    channel: params.channel,
    purpose: params.purpose,
    recipient: params.recipient,
    reservation_id: params.reservationId ?? null,
    success: params.success,
    error: params.error ?? null,
  });
}
