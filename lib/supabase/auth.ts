import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * 관리자 인증.
 *
 * 이 사이트는 "로그인한 사용자 = 관리자"다. Supabase Auth에서 이메일
 * 회원가입을 꺼두었기 때문에 계정은 사장님이 직접 만든 것 하나뿐이다.
 * (docs/SUPABASE_SETUP.md 3번)
 */

/** 로그인한 사용자. 없으면 null. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  // getSession()이 아니라 getUser()를 쓴다. getSession()은 쿠키를 그대로
  // 믿지만 getUser()는 Supabase에 확인하므로 위조된 쿠키를 거른다.
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * 로그인하지 않았으면 로그인 화면으로 보낸다.
 * 관리자 페이지와 모든 서버 액션의 첫 줄에서 부른다 —
 * 서버 액션은 화면을 거치지 않고 POST로 직접 호출될 수 있기 때문이다.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
