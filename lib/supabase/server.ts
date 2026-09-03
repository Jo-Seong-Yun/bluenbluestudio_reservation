import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * 서버 컴포넌트/라우트 핸들러에서 쓰는 Supabase 클라이언트.
 * 로그인한 사용자의 쿠키를 그대로 읽어 관리자 세션을 유지한다.
 * anon 키 기반이므로 RLS가 적용된다 — 관리자 권한은 로그인 여부로 결정된다.
 *
 * 서버 컴포넌트 안에서 쿠키를 새로 쓰려고 하면 Next.js가 에러를 던진다.
 * (라우트 핸들러나 Server Action에서만 실제로 쓰기가 가능하다) 그래서
 * setAll을 try/catch로 감싼다 — 세션 갱신은 proxy.ts에서 처리하므로 무시해도 된다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출된 경우. proxy.ts가 세션 갱신을 담당하므로 무시.
        }
      },
    },
  });
}
