import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Called only after server validation and a successful reservation RPC. */
export async function saveSubmittedAnswers(
  reservationId: string,
  answers: { fieldId: string; value: string }[],
): Promise<boolean> {
  if (!answers.length) return true;
  try {
    const db = createAdminClient();
    const { error } = await db
      .from("reservation_answers")
      .insert(
        answers.map((answer) => ({
          reservation_id: reservationId,
          field_id: answer.fieldId,
          value: answer.value,
        })),
      );
    if (error) throw error;
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code).slice(0, 50)
        : "unknown";
    console.error("예약 답변 저장 실패", { reservationId, code });
    // Keep the already accepted reservation and price; leave a durable operator signal.
    try {
      const { error: auditError } = await createAdminClient()
        .from("audit_logs")
        .insert({
          actor_type: "system",
          source_table: "reservations",
          source_id: reservationId,
          operation: "event",
          event_kind: "answer_save_failed",
          details: { error_code: code, answer_count: answers.length },
        });
      if (auditError)
        console.error("답변 저장 실패 이력 기록 실패", { reservationId });
    } catch {
      console.error("답변 저장 실패 이력 기록 실패", { reservationId });
    }
    return false;
  }
}
