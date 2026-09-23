import "server-only";
import { createAdminClient } from "../supabase/admin";
import type { EmailRecipient, EmailRule, EmailTriggerType } from "./email-rules-shared";

export {
  EMAIL_TRIGGER_TYPES,
  EMAIL_TRIGGER_LABELS,
  DAY_OFFSET_TRIGGER_TYPES,
  EMAIL_RECIPIENTS,
  EMAIL_RECIPIENT_LABELS,
  EMAIL_VARIABLES,
  EMAIL_VARIABLE_PREVIEW_VALUES,
  renderEmailTemplate,
} from "./email-rules-shared";
export type { EmailRecipient, EmailRule, EmailTriggerType } from "./email-rules-shared";

type EmailRuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  recipient: string;
  trigger_type: string;
  day_offset: number | null;
  product_id: string | null;
  subject: string;
  body: string;
};

const EMAIL_RULE_COLUMNS =
  "id, name, enabled, recipient, trigger_type, day_offset, product_id, subject, body";

function mapRow(row: EmailRuleRow): EmailRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    recipient: row.recipient as EmailRecipient,
    triggerType: row.trigger_type as EmailTriggerType,
    dayOffset: row.day_offset,
    productId: row.product_id,
    subject: row.subject,
    body: row.body,
  };
}

/**
 * 발송 직전, 이 트리거에 걸려 있는 켜진 규칙을 모두 읽는다. 손님 예약
 * 흐름(anon)에서도 불러야 해서 서비스 역할로 RLS를 우회한다(다른
 * server-only 로더들과 같은 이유). 상품 필터(product_id)가 걸린
 * 규칙은 이 발송 건의 상품과 일치할 때만 돌려준다 — null이면 전체
 * 상품에 적용되는 규칙이라 항상 포함한다.
 */
export async function loadEmailRulesForTrigger(
  triggerType: EmailTriggerType,
  productId: string | null,
): Promise<EmailRule[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_rules")
    .select(EMAIL_RULE_COLUMNS)
    .eq("trigger_type", triggerType)
    .eq("enabled", true);

  return (data ?? [])
    .filter((row) => row.product_id === null || row.product_id === productId)
    .map(mapRow);
}

/** 촬영일 기준 며칠 전/후 규칙 전체 — 크론이 매일 훑을 때 쓴다. */
export async function loadDayOffsetEmailRules(): Promise<EmailRule[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_rules")
    .select(EMAIL_RULE_COLUMNS)
    .in("trigger_type", ["days_before_shoot", "days_after_shoot"])
    .eq("enabled", true);
  return (data ?? []).map(mapRow);
}

/** 관리자 설정 화면이 목록을 한 번에 다 보여줄 때 쓴다. */
export async function loadAllEmailRules(): Promise<EmailRule[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_rules")
    .select(EMAIL_RULE_COLUMNS)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapRow);
}
