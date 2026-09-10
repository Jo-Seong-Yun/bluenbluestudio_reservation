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

/**
 * SMS 발송 스위치. 솔라피는 건당 비용이 들어서, 키는 그대로 둔 채 이
 * 값만으로 잠깐 꺼둘 수 있게 만들었다 — 다시 켤 때 API 키를 또 찾아
 * 넣지 않아도 된다. 값을 정확히 "false"로 줬을 때만 꺼지고, 안 정하면
 * (기존처럼) 켜진 채로 동작한다. 이메일은 이 스위치와 무관하게 항상
 * 그대로 나간다.
 */
export function smsNotificationsEnabled(): boolean {
  return process.env.SOLAPI_SMS_ENABLED !== "false";
}

/**
 * 카카오 알림톡(솔라피 경유) 설정.
 *
 * SMS/이메일과 달리 필수가 아니다 — 카카오톡 채널 개설, 솔라피에 발신
 * 프로필(pfId) 등록, 목적별 템플릿 사전 심사까지 끝나야 값이 생기는데
 * 그전까진 그냥 비워 두면 된다(사업자등록이 필요해 로드맵상 SMS보다
 * 나중에 켜는 채널). `required()`처럼 던지지 않고 undefined를 돌려주는
 * 이유는 그래서다 — notify.ts가 이 값들이 있는지로 "지금 알림톡을 쓸 수
 * 있는가"를 판단해 없으면 조용히 SMS만 쓴다.
 */
export function solapiKakaoPfId(): string | undefined {
  return process.env.SOLAPI_KAKAO_PF_ID || undefined;
}

/**
 * 알림 목적별 알림톡 템플릿 ID. 카카오 심사는 문구 단위로 나기 때문에
 * customer_requested/confirmed/cancelled/reminder, admin_new_request
 * 다섯 개를 따로 등록해야 한다. 하나라도 비어 있으면 그 목적은 SMS로
 * 대체한다(getKakaoTemplateId 참고).
 */
const KAKAO_TEMPLATE_ENV_KEYS = {
  customer_requested: "SOLAPI_KAKAO_TEMPLATE_CUSTOMER_REQUESTED",
  customer_confirmed: "SOLAPI_KAKAO_TEMPLATE_CUSTOMER_CONFIRMED",
  customer_cancelled: "SOLAPI_KAKAO_TEMPLATE_CUSTOMER_CANCELLED",
  customer_reminder: "SOLAPI_KAKAO_TEMPLATE_CUSTOMER_REMINDER",
  admin_new_request: "SOLAPI_KAKAO_TEMPLATE_ADMIN_NEW_REQUEST",
} as const;

export type KakaoNotificationPurpose = keyof typeof KAKAO_TEMPLATE_ENV_KEYS;

export function solapiKakaoTemplateId(
  purpose: KakaoNotificationPurpose,
): string | undefined {
  return process.env[KAKAO_TEMPLATE_ENV_KEYS[purpose]] || undefined;
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
