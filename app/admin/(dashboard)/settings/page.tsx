import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { GoogleSheetsBackfillSection } from "./google-sheets-backfill-section";
import { GoogleCalendarBackfillSection } from "./google-calendar-backfill-section";
import { RecordSheetTemplateSection } from "./record-sheet-template-section";
import { getRecordSheetTemplateRows } from "@/lib/record-sheet/template-store";
import { getPricedOptionLabels } from "@/app/admin/actions";

export const metadata: Metadata = { title: "예약 설정" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, recordSheetRows, pricedOptionLabels] =
    await Promise.all([
      supabase
        .from("settings")
        .select(
          "slot_interval_min, min_lead_days, max_advance_days, cancel_deadline_hours, bank_account, studio_intro, notice, reservation_success_heading, reservation_success_message, admin_notify_phone, admin_notify_email, show_product_thumbnails, logo_url, brand_color",
        )
        .eq("id", 1)
        .single(),
      getRecordSheetTemplateRows(),
      getPricedOptionLabels(),
    ]);

  if (!settings) {
    return (
      <p className="text-muted text-sm">
        설정 행을 찾을 수 없습니다. 마이그레이션이 제대로 적용되었는지 확인해 주시기 바랍니다.
      </p>
    );
  }

  return (
    <div>
      <SettingsForm
        initial={{
          slotIntervalMin: settings.slot_interval_min,
          minLeadDays: settings.min_lead_days,
          maxAdvanceDays: settings.max_advance_days,
          cancelDeadlineHours: settings.cancel_deadline_hours,
          bankAccount: settings.bank_account ?? "",
          studioIntro: settings.studio_intro ?? "",
          notice: settings.notice ?? "",
          reservationSuccessHeading: settings.reservation_success_heading,
          reservationSuccessMessage: settings.reservation_success_message,
          adminNotifyPhone: settings.admin_notify_phone ?? "",
          adminNotifyEmail: settings.admin_notify_email ?? "",
          showProductThumbnails: settings.show_product_thumbnails,
          logoUrl: settings.logo_url ?? "",
          brandColor: settings.brand_color ?? "",
        }}
      />

      <div className="mt-10 max-w-xl">
        <RecordSheetTemplateSection
          initialRows={recordSheetRows}
          optionLabels={pricedOptionLabels}
        />
      </div>

      <div className="mt-10 max-w-xl">
        <GoogleSheetsBackfillSection />
        <GoogleCalendarBackfillSection />
      </div>
    </div>
  );
}
