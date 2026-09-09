/**
 * proxy.ts(에지 런타임)와 lib/supabase/auth.ts(서버 액션에서 쓰는 일반
 * 서버 코드) 둘 다 이 이름을 알아야 한다. 이 상수만 담은 파일을 따로
 * 두는 이유는, auth.ts가 proxy.ts를 통째로 import하면
 * createServerClient 같은 무거운 의존성까지 서버 액션 번들에 딸려
 * 들어오기 때문이다.
 */
export const VERIFIED_ADMIN_HEADER = "x-verified-admin";
