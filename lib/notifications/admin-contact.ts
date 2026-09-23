import "server-only";
import { createAdminClient } from "../supabase/admin";

/**
 * 이벤트(확정/취소/일정변경 등) 알림에도 사장님용 이메일 규칙이 걸려
 * 있을 수 있어, 그 지점마다 admin_notify_email을 따로 조회해야 한다.
 * 여러 서버 액션에서 반복되는 조회라 공용 함수로 뺐다.
 */
export async function getAdminNotifyEmail(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("admin_notify_email")
    .eq("id", 1)
    .single();
  return data?.admin_notify_email ?? null;
}
