import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
/** DB mutations are captured transactionally by triggers; navigation/auth are best effort. */
export async function recordAdminSession(
  actorId: string,
  operation: "navigation" | "login" | "logout",
  path?: string,
) {
  try {
    const { error } = await createAdminClient()
      .from("audit_logs")
      .insert({
        actor_type: "admin",
        actor_id: actorId,
        source_table: "admin_session",
        source_id: actorId,
        operation,
        details: path ? { path } : {},
      });
    if (error) console.error("관리자 접속 이력 저장 실패", error.code);
  } catch {
    console.error("관리자 접속 이력 저장 실패");
  }
}
