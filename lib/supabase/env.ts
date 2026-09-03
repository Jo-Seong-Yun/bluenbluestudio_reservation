/**
 * Supabase 환경변수를 한 곳에서 검증한다.
 * 값이 비어 있으면(=.env.local 설정 전) 바로 알아볼 수 있는 에러로 실패한다.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 없습니다. .env.example 을 .env.local 로 복사하고 ` +
        `Supabase 프로젝트 값을 채워주세요. 찾는 위치는 docs/SUPABASE_SETUP.md 참고.`,
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
