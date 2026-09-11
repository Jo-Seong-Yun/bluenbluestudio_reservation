import "server-only";
import { createAdminClient } from "../supabase/admin";
import {
  EMAIL_TEMPLATE_PURPOSES,
  type EmailTemplate,
  type EmailTemplatePurpose,
} from "./email-templates-shared";

export {
  EMAIL_TEMPLATE_PURPOSES,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_VARIABLES,
  EMAIL_TEMPLATE_PREVIEW_VALUES,
  DEFAULT_EMAIL_TEMPLATES,
  renderEmailTemplate,
} from "./email-templates-shared";
export type { EmailTemplate, EmailTemplatePurpose } from "./email-templates-shared";

/**
 * 발송 시점에 이 목적(purpose)의 커스텀 문구를 읽는다. 행이 없으면(아직
 * 관리자가 안 고쳤거나, 마이그레이션 전) null을 돌려주고 호출한 쪽
 * (notify.ts)이 하드코딩된 기본 문구로 조용히 되돌아간다 — 손님 예약
 * 흐름(anon)에서도 부르므로 service role로 읽어 RLS 걱정 없이 항상
 * 값을 가져온다(log.ts와 같은 이유).
 */
export async function loadEmailTemplate(
  purpose: EmailTemplatePurpose,
): Promise<EmailTemplate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("purpose", purpose)
    .maybeSingle();
  return data;
}

/** 관리자 설정 화면이 한 번에 5개를 다 보여줘야 할 때 쓴다. */
export async function loadAllEmailTemplates(): Promise<
  Partial<Record<EmailTemplatePurpose, EmailTemplate>>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("purpose, subject, body")
    .in("purpose", EMAIL_TEMPLATE_PURPOSES);

  const result: Partial<Record<EmailTemplatePurpose, EmailTemplate>> = {};
  for (const row of data ?? []) {
    result[row.purpose as EmailTemplatePurpose] = {
      subject: row.subject,
      body: row.body,
    };
  }
  return result;
}
