"use server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { updateBookingSettings } from "@/lib/booking/style-storage";
import { revalidatePath } from "next/cache";
export async function saveDepositMode(
  _previous: { error?: string; success?: boolean } | null,
  form: FormData,
) {
  await requireAdmin();
  if (!["true", "false"].includes(String(form.get("depositEnabled"))))
    return { error: "예약금 설정을 다시 선택해주세요." };
  const enabled = form.get("depositEnabled") === "true";
  const db = await createClient();
  const { error } = await db
    .from("reservations")
    .select("deposit_required")
    .limit(0);
  if (error)
    return {
      error:
        "예약금 적용 여부를 예약별로 보존하려면 20261030000100_deposit_mode.sql을 먼저 실행해 주세요.",
    };
  try {
    await updateBookingSettings((current) => ({
      ...current,
      depositEnabled: enabled,
    }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장하지 못했습니다." };
  }
  revalidatePath("/booking", "layout");
  revalidatePath("/admin/settings");
  return { success: true };
}
