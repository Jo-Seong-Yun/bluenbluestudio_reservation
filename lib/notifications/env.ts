import "server-only";

/**
 * 알림(SMS/이메일) 발송 환경변수.
 *
 * Supabase 키와 달리 이 값들이 없다고 화면을 막지는 않는다 — 예약 자체는
 * 알림 발송과 무관하게 계속돼야 한다(발송은 best-effort). 값이 없으면
 * `required()`가 던지고, 그 에러는 lib/notifications/notify.ts가 잡아
 * notification_logs에 실패로 남긴다.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 없습니다.`);
  }
  return value;
}

export function solapiApiKey(): string {
  return required("SOLAPI_API_KEY");
}

export function solapiApiSecret(): string {
  return required("SOLAPI_API_SECRET");
}

/** 발신번호. 솔라피에 사전 등록된 번호여야 한다. */
export function solapiSenderPhone(): string {
  return required("SOLAPI_SENDER_PHONE");
}

export function resendApiKey(): string {
  return required("RESEND_API_KEY");
}

/** 발신 이메일. Resend에 도메인 인증이 끝난 주소여야 한다. */
export function resendFromEmail(): string {
  return required("RESEND_FROM_EMAIL");
}

export const NOTIFICATION_ENV_VARS = [
  "SOLAPI_API_KEY",
  "SOLAPI_API_SECRET",
  "SOLAPI_SENDER_PHONE",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const;
