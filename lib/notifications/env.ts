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

/** 발신에 쓸 Gmail 주소. */
export function gmailUser(): string {
  return required("GMAIL_USER");
}

/**
 * Gmail 앱 비밀번호. 로그인 비밀번호가 아니라 Google 계정의
 * 2단계 인증을 켠 뒤 "앱 비밀번호"에서 따로 발급받는 16자리 값이다.
 * 도메인 인증 없이 무료로 메일을 보내려고 Resend 대신 Gmail SMTP를 쓴다.
 */
export function gmailAppPassword(): string {
  return required("GMAIL_APP_PASSWORD");
}

export const NOTIFICATION_ENV_VARS = [
  "SOLAPI_API_KEY",
  "SOLAPI_API_SECRET",
  "SOLAPI_SENDER_PHONE",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
] as const;
