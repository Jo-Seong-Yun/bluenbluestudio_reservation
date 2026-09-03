/**
 * Supabase 환경변수.
 *
 * 값이 없을 때 그냥 던지면 화면에는 "Internal Server Error" 한 줄만 남는다.
 * (Next.js는 운영 모드에서 서버 에러 내용을 감춘다) 무엇이 빠졌는지 화면에
 * 보여줄 수 있도록, 던지는 함수와 확인만 하는 함수를 나눠 둔다.
 */

/** NEXT_PUBLIC_ 접두사가 붙은 값은 빌드 시점에 번들에 박힌다. */
const PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const SERVER_VARS = ["SUPABASE_SECRET_KEY"] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 없습니다. docs/SUPABASE_SETUP.md 2번을 참고하세요.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL");
}

/** 브라우저에 노출돼도 되는 공개 키 (sb_publishable_... / 옛 이름 anon). */
export function supabasePublishableKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

/**
 * RLS를 우회하는 비밀 키 (sb_secret_... / 옛 이름 service_role).
 * 서버 전용. 절대 클라이언트 번들에 들어가면 안 된다.
 */
export function supabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY");
}

/**
 * 로그인에 필요한 값이 갖춰졌는지. 화면을 그리기 전에 확인하려고 쓴다.
 *
 * NEXT_PUBLIC_ 값을 `process.env[name]` 처럼 변수로 읽으면 번들러가 치환하지
 * 못한다. 그래서 이름을 하나씩 직접 적는다.
 */
export function missingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return missing;
}

/** 예약 가능 시간 계산까지 하려면 비밀 키도 필요하다. */
export function missingServerEnv(): string[] {
  const missing = missingAuthEnv();
  if (!process.env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
  return missing;
}

export const SUPABASE_ENV_VARS = [...PUBLIC_VARS, ...SERVER_VARS];
