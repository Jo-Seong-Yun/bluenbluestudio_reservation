import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { depositEnabled, requiresDeposit } from "./deposit";
export async function reservationDepositRequired(
  id?: string | null,
): Promise<boolean> {
  try {
    const db = createAdminClient();
    if (id) {
      const { data, error } = await db
        .from("reservations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) throw new Error("예약금 방식 조회 실패");
      return requiresDeposit(data);
    }
    const { data, error } = await db
      .from("settings")
      .select("booking_style")
      .eq("id", 1)
      .single();
    if (error || !data) throw new Error("예약금 설정 조회 실패");
    return depositEnabled(data.booking_style);
  } catch (error) {
    console.error(
      "예약금 방식 확인 실패 — 발송 중단",
      error instanceof Error ? error.message : "조회 실패",
    );
    throw error;
  }
}
