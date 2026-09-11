import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { EmailTemplatesSection } from "./email-templates-section";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_PURPOSES,
  type EmailTemplate,
  type EmailTemplatePurpose,
} from "@/lib/notifications/email-templates-shared";

export const metadata: Metadata = { title: "예약 설정" };
// 새로 추가한 이메일 문구 섹션이 캐시된 옛 페이지 때문에 안 보이는 일이
// 없게, 이 페이지는 항상 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: emailTemplateRows }] = await Promise.all([
    supabase
      .from("settings")
      .select(
        "slot_interval_min, min_lead_days, max_advance_days, cancel_deadline_hours, bank_account, studio_intro, notice, admin_notify_phone, admin_notify_email",
      )
      .eq("id", 1)
      .single(),
    supabase
      .from("email_templates")
      .select("purpose, subject, body")
      .in("purpose", EMAIL_TEMPLATE_PURPOSES),
  ]);

  if (!settings) {
    return (
      <p className="text-muted text-sm">
        설정 행을 찾을 수 없어요. 마이그레이션이 제대로 적용됐는지 확인해주세요.
      </p>
    );
  }

  // DB에 아직 행이 없는 목적(마이그레이션 직후 등)은 하드코딩된 기본
  // 문구로 채워, 화면에서는 5개 목적이 항상 다 보이게 한다.
  const emailTemplates: Record<EmailTemplatePurpose, EmailTemplate> = {
    ...DEFAULT_EMAIL_TEMPLATES,
  };
  for (const row of emailTemplateRows ?? []) {
    emailTemplates[row.purpose as EmailTemplatePurpose] = {
      subject: row.subject,
      body: row.body,
    };
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
          adminNotifyPhone: settings.admin_notify_phone ?? "",
          adminNotifyEmail: settings.admin_notify_email ?? "",
        }}
      />

      <div className="mt-10 max-w-xl">
        <EmailTemplatesSection initial={emailTemplates} />
      </div>
    </div>
  );
}
