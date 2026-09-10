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
 * getUser()는 요청마다 Supabase Auth 서버를 한 번 왕복해서 확인하는
 * 호출이다 — 예전엔 여기서 한 번, 각 서버 액션(requireAdmin)이 또
 * 한 번, 총 두 번씩 왕복했다가 한 번으로 줄였는데도(관리자 버튼 왕복을
 * 절반으로 줄임 커밋) 여전히 admin 요청마다 그 한 번의 왕복 자체가
 * 남아 있어 크게 안 빨라졌다.
 *
 * getClaims()로 바꾸면 이 왕복이 통째로 없어진다 — JWT 서명을
 * Supabase의 공개키(JWKS, /.well-known/jwks.json)로 이 프로세스
 * 안에서 직접 검증하기 때문에 매번 네트워크를 타지 않는다. 쿠키를
 * 무조건 믿는 getSession()과는 다르다 — 서명 검증을 하므로 위조된
 * 토큰은 여전히 걸러진다. JWKS 자체는 10분 캐시(@supabase/auth-js가
 * 프로세스 전역에 들고 있음)라 처음 한 번만 왕복하고, 그 뒤로는 순수
 * 로컬 연산이다. (auth-js 공식 주석: "Prefer this method over
 * getUser() which always sends a request to the Auth server for
 * each JWT.") 프로젝트가 옛날 방식(대칭키 서명)이면 auth-js가 자동으로
 * getUser()로 되돌아가므로 이 프로젝트가 어느 쪽이든 안전하다.
 *
 * 이제 여기서 딱 한 번만(그마저도 대부분 로컬 연산으로) 확인하고,
 * 그 결과를 요청 헤더에 실어 보낸다. 이 헤더는 클라이언트가 보낸
 * 원본 요청에 같은 이름이 있어도 아래에서 항상 덮어써서, 위조된
 * 값이 그대로 통과할 수 없다. (matcher가 /admin/:path* 이므로 이
 * 경로로 들어오는 모든 요청—서버 액션의 POST 포함—은 반드시 여기를
 * 거친다. 우회할 방법이 없다.)
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

  const { data } = await supabase.auth.getClaims();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_ADMIN_HEADER);
  if (data?.claims) requestHeaders.set(VERIFIED_ADMIN_HEADER, data.claims.sub);

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
