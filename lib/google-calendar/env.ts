import "server-only";
import {
  googleServiceAccountEmail,
  googleServiceAccountPrivateKey,
} from "@/lib/google-sheets/env";

/**
 * 구글 캘린더 연동 환경변수. 서비스 계정 이메일·비공개 키는 구글
 * 스프레드시트 연동과 같은 계정을 그대로 쓴다(lib/google-sheets/env.ts) —
 * 같은 서비스 계정에 캘린더 API 권한만 추가로 켜면 되므로 계정을 따로
 * 만들 필요가 없다. 여기서는 대상 캘린더 id만 별도로 관리한다.
 *
 * lib/notifications/env.ts와 같은 원칙 — 값이 없다고 예약 흐름을
 * 막지 않는다. 캘린더 동기화도 백업/편의 기능이라 best-effort다.
 */
export function googleCalendarId(): string | undefined {
  return process.env.GOOGLE_CALENDAR_ID || undefined;
}

export function googleCalendarConfigured(): boolean {
  return Boolean(
    googleServiceAccountEmail() &&
      googleServiceAccountPrivateKey() &&
      googleCalendarId(),
  );
}
