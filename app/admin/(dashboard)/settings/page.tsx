import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "예약 설정" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select(
      "slot_interval_min, min_lead_days, max_advance_days, cancel_deadline_hours, bank_account, studio_intro, notice",
    )
    .eq("id", 1)
    .single();

  if (!settings) {
    return (
      <p className="text-muted text-sm">
        설정 행을 찾을 수 없어요. 마이그레이션이 제대로 적용됐는지 확인해주세요.
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">예약 설정</h1>
      <SettingsForm
        initial={{
          slotIntervalMin: settings.slot_interval_min,
          minLeadDays: settings.min_lead_days,
          maxAdvanceDays: settings.max_advance_days,
          cancelDeadlineHours: settings.cancel_deadline_hours,
          bankAccount: settings.bank_account ?? "",
          studioIntro: settings.studio_intro ?? "",
          notice: settings.notice ?? "",
        }}
      />
    </div>
  );
}
