import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * 관리자 로그인 세션을 갱신한다.
 * (Next.js 16부터 이 파일은 middleware.ts가 아니라 proxy.ts다.
 *  node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md)
 *
 * matcher를 /admin 으로 좁힌 이유가 두 가지 있다.
 *   1. 손님 페이지는 로그인과 무관하다. 매 요청마다 Supabase를 부를 이유가 없다
 *   2. Supabase 설정이 안 된 상태에서도 랜딩 페이지는 떠야 한다.
 *      전체 경로에 걸었더니 환경변수가 없을 때 첫 화면까지 500이 났다
 *
 * 여기서는 세션 쿠키를 최신으로 유지만 한다. "로그인 안 했으면 막기"는
 * app/admin/(dashboard)/layout.tsx 에서 서버가 직접 확인한다 —
 * proxy의 낙관적 검사만으로 인가를 대신하지 말라는 게 Next.js 권고다.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 만료됐으면 이 호출에서 갱신된다. 반환값은 쓰지 않는다.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
