import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { SubmittedApplication } from "./submission";
export async function saveApplicationOriginal(
  id: string,
  snapshot: SubmittedApplication,
): Promise<boolean> {
  try {
    const { error } = await createAdminClient()
      .from("reservation_submissions")
      .insert({
        reservation_id: id,
        content: JSON.parse(JSON.stringify(snapshot)) as Json,
      });
    if (error) throw error;
    return true;
  } catch {
    console.error("신청서 원본 저장 실패", { reservationId: id });
    return false;
  }
}
export async function markSubmission(
  id: string,
  originalSaved: boolean,
  answersSaved: boolean,
  issues: string[],
) {
  const errors = [
    ...issues,
    ...(!originalSaved ? ["original_save_failed"] : []),
    ...(!answersSaved ? ["answers_save_failed"] : []),
  ];
  const state =
    originalSaved && answersSaved && !issues.length
      ? "complete"
      : originalSaved || answersSaved
        ? "partial"
        : "failed";
  try {
    const { error } = await createAdminClient()
      .from("reservations")
      .update({ submission_state: state, submission_error_codes: errors })
      .eq("id", id);
    if (error) throw error;
  } catch {
    console.error("신청서 보존 상태 기록 실패", { reservationId: id });
  }
}
