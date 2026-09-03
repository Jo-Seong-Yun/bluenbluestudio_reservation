import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * service role 키로 만드는 관리용 클라이언트. RLS를 완전히 우회한다.
 *
 * 용도는 두 가지뿐이다.
 *   1. 예약 가능 시간 계산 (Phase 3) — weekly_hours/date_overrides/blocks를
 *      손님 요청에도 서버가 직접 읽어야 하는데, 이 테이블들은 관리자 전용
 *      RLS라 anon/로그인 사용자 키로는 못 읽는다.
 *   2. 관리자 페이지의 백오피스 작업 중 RLS로 표현하기 번거로운 것들.
 *
 * "server-only" 임포트가 있어서, 실수로 클라이언트 컴포넌트에서 이 파일을
 * import하면 빌드 시점에 에러가 난다. 절대 브라우저로 보내면 안 되는 키다.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseUrl(),
    supabaseServiceRoleKey(),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
