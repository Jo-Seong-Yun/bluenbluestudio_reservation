import "server-only";

/**
 * 구글 스프레드시트 백업 연동 환경변수.
 *
 * lib/notifications/env.ts와 같은 원칙 — 이 값들이 없다고 예약 흐름을
 * 막지 않는다. 백업은 어디까지나 곁가지(best-effort)라, 셋 중 하나라도
 * 비어 있으면 `configured()`가 false를 돌려주고 sync.ts는 조용히
 * 아무것도 하지 않는다(카카오 pfId/템플릿ID 미설정 때와 같은 처리).
 */

function value(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function googleServiceAccountEmail(): string | undefined {
  return value("GOOGLE_SHEETS_CLIENT_EMAIL");
}

/**
 * 서비스 계정 비공개 키(PEM). Vercel 환경변수는 여러 줄 문자열을 그대로
 * 못 받아, 키 발급 시 받은 JSON의 private_key 값을 그대로 붙여넣으면
 * 줄바꿈이 리터럴 "\n" 두 글자로 저장된다 — 여기서 진짜 줄바꿈으로
 * 되돌린다.
 */
export function googleServiceAccountPrivateKey(): string | undefined {
  const raw = value("GOOGLE_SHEETS_PRIVATE_KEY");
  return raw?.replace(/\\n/g, "\n");
}

export function googleSheetsSpreadsheetId(): string | undefined {
  return value("GOOGLE_SHEETS_SPREADSHEET_ID");
}

/** 세 값이 모두 있어야 "쓸 수 있는 상태"다. */
export function googleSheetsConfigured(): boolean {
  return Boolean(
    googleServiceAccountEmail() &&
      googleServiceAccountPrivateKey() &&
      googleSheetsSpreadsheetId(),
  );
}
