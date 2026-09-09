import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { VERIFIED_ADMIN_HEADER } from "@/lib/supabase/auth-header";

/**
 * 관리자 인증.
 *
 * 이 사이트는 "로그인한 사용자 = 관리자"다. Supabase Auth에서 이메일
 * 회원가입을 꺼두었기 때문에 계정은 사장님이 직접 만든 것 하나뿐이다.
 * (docs/SUPABASE_SETUP.md 3번)
 *
 * 로그인 확인 자체(Supabase에 실제로 물어보는 getUser() 호출)는
 * proxy.ts가 /admin 요청마다 이미 한 번 한다. 여기서 또 하면 버튼 하나
 * 누를 때마다 Supabase 왕복이 두 번 생긴다 — 그래서 여기서는 그 결과를
 * 요청 헤더에서 읽기만 한다. 이 헤더는 proxy.ts가 매 요청마다 확인 후
 * 다시 쓰므로(클라이언트가 보낸 값은 항상 버림) 위조할 수 없고, matcher가
 * /admin/:path* 라 이 경로로 오는 요청(서버 액션의 POST 포함)은 반드시
 * proxy를 거친다 — 우회해서 이 헤더만 직접 만들어 보낼 방법이 없다.
 */

/** 로그인한 관리자의 user id. 없으면 null. */
export async function getAdminUserId(): Promise<string | null> {
  const h = await headers();
  return h.get(VERIFIED_ADMIN_HEADER);
}

/**
 * 로그인하지 않았으면 로그인 화면으로 보낸다.
 * 관리자 페이지와 모든 서버 액션의 첫 줄에서 부른다 —
 * 서버 액션은 화면을 거치지 않고 POST로 직접 호출될 수 있기 때문이다.
 */
export async function requireAdmin(): Promise<string> {
  const userId = await getAdminUserId();
  if (!userId) redirect("/admin/login");
  return userId;
}
