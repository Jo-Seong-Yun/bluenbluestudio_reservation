import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  missingAuthEnv,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import { VERIFIED_ADMIN_HEADER } from "@/lib/supabase/auth-header";

/**
 * 관리자 로그인 세션을 갱신하고, 로그인 여부를 확인한다.
 * (Next.js 16부터 이 파일은 middleware.ts가 아니라 proxy.ts다.
 *  node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md)
 *
 * matcher를 /admin 으로 좁힌 이유가 두 가지 있다.
 *   1. 손님 페이지는 로그인과 무관하다. 매 요청마다 Supabase를 부를 이유가 없다
 *   2. Supabase 설정이 안 된 상태에서도 랜딩 페이지는 떠야 한다.
 *      전체 경로에 걸었더니 환경변수가 없을 때 첫 화면까지 500이 났다
 *
 * getUser()는 쿠키만 믿는 게 아니라 Supabase에 실제로 확인하는
 * 호출이라 왕복 시간이 든다. 예전엔 여기서 한 번, 그리고 각 서버
 * 액션(lib/supabase/auth.ts의 requireAdmin)이 또 한 번, 요청마다
 * 두 번씩 확인했다 — 그래서 버튼 하나 누를 때마다 그 왕복이 두 배로
 * 들었다. 이제는 여기서 딱 한 번만 확인하고, 그 결과를 요청 헤더에
 * 실어 보낸다. 이 헤더는 클라이언트가 보낸 원본 요청에 같은 이름이
 * 있어도 아래에서 항상 덮어써서, 위조된 값이 그대로 통과할 수 없다.
 * (matcher가 /admin/:path* 이므로 이 경로로 들어오는 모든 요청—서버
 * 액션의 POST 포함—은 반드시 여기를 거친다. 우회할 방법이 없다.)
 *
 * "로그인 안 했으면 막기"는 app/admin/(dashboard)/layout.tsx와 각
 * 서버 액션이 헤더를 보고 직접 판단한다 — proxy의 낙관적 검사만으로
 * 인가를 대신하지 말라는 게 Next.js 권고다.
 */
export async function proxy(request: NextRequest) {
  // 설정이 없으면 여기서 던지지 않고 그냥 통과시킨다. 던지면 페이지에
  // 닿기도 전에 500이 나서, 화면이 "무엇이 빠졌는지" 알려줄 기회를 잃는다.
  if (missingAuthEnv().length > 0) return NextResponse.next({ request });

  const cookiesToForward: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        cookiesToForward.push(...cookiesToSet);
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_ADMIN_HEADER);
  if (data.user) requestHeaders.set(VERIFIED_ADMIN_HEADER, data.user.id);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  for (const { name, value, options } of cookiesToForward) {
    response.cookies.set(name, value, options);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
