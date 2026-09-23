import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, kstToday, kstToInstant } from "@/lib/time";
import {
  hasRuleEmailBeenSent,
  notifyCustomerReminder,
  sendDayOffsetRuleEmail,
} from "@/lib/notifications/notify";
import { loadDayOffsetEmailRules, type EmailRule } from "@/lib/notifications/email-rules";
import { getAdminNotifyEmail } from "@/lib/notifications/admin-contact";
import { buildEmailVariables } from "@/lib/notifications/templates";
import { getProductName } from "@/lib/notifications/product-name";

export const dynamic = "force-dynamic";

/**
 * 촬영 전날 리마인드 + 촬영일 기준 이메일 규칙 스윕. Vercel Cron이
 * 매일 한 번 호출한다(vercel.json의 crons 항목).
 *
 * Vercel Cron 요청에는 자동으로 `Authorization: Bearer $CRON_SECRET`이
 * 실린다. 이 라우트는 그 값을 확인해, 경로를 알아도 남이 그냥 호출하지
 * 못하게 막는다.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 확정(confirmed)된 예약 중 "내일" 촬영인 것만, 아직 안 보낸 것만
  // (`reminded_at is null`) 골라 SMS·알림톡을 보낸다 — 크론이 재시도
  // 등으로 하루에 두 번 불려도 중복 발송되지 않게 막는 장치다. 이메일은
  // 아래 이메일 규칙 스윕이 따로 담당한다(day_offset을 관리자가 자유롭게
  // 바꿀 수 있어 "내일"에 고정되지 않는다).
  const tomorrow = addDays(kstToday(), 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);
  const rangeStart = kstToInstant(tomorrow, "00:00").toISOString();
  const rangeEnd = kstToInstant(dayAfterTomorrow, "00:00").toISOString();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(
      "id, code, customer_name, customer_phone, shoot_start, shoot_location, product_id",
    )
    .eq("status", "confirmed")
    .is("reminded_at", null)
    .gte("shoot_start", rangeStart)
    .lt("shoot_start", rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const reservation of reservations ?? []) {
    // status='confirmed' 조건으로 걸러 왔으니 shoot_start는 항상 있다
    // (아직 후보만 낸 requested 상태만 null일 수 있다).
    if (!reservation.shoot_start) continue;

    const productName = await getProductName(reservation.product_id);
    await notifyCustomerReminder({
      reservationId: reservation.id,
      productId: reservation.product_id,
      customerName: reservation.customer_name,
      customerPhone: reservation.customer_phone,
      productName,
      shootStart: new Date(reservation.shoot_start),
      shootLocation: reservation.shoot_location,
      code: reservation.code,
    });
    await supabase
      .from("reservations")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", reservation.id);
    sent += 1;
  }

  const emailRulesSent = await sweepDayOffsetEmailRules();

  return NextResponse.json({ sent, emailRulesSent });
}

/**
 * "촬영 며칠 전/후" 이메일 규칙을 전부 훑어, 오늘이 그 며칠째에
 * 해당하는 확정 예약을 찾아 보낸다. 같은 규칙이 같은 예약에 두 번
 * 나가지 않게 notification_logs로 이미 보낸 적 있는지 먼저 확인한다
 * (hasRuleEmailBeenSent) — 리마인드처럼 예약에 플래그 컬럼 하나를 두는
 * 방식은 규칙이 여러 개일 수 있어 쓸 수 없다.
 */
async function sweepDayOffsetEmailRules(): Promise<number> {
  const rules = await loadDayOffsetEmailRules();
  if (rules.length === 0) return 0;

  const supabase = createAdminClient();
  const adminEmail = await getAdminNotifyEmail();
  const today = kstToday();
  let sent = 0;

  for (const rule of rules) {
    sent += await sendRuleToTargetDay(supabase, rule, today, adminEmail);
  }

  return sent;
}

async function sendRuleToTargetDay(
  supabase: ReturnType<typeof createAdminClient>,
  rule: EmailRule,
  today: ReturnType<typeof kstToday>,
  adminEmail: string | null,
): Promise<number> {
  if (!rule.dayOffset) return 0;

  const targetDay =
    rule.triggerType === "days_before_shoot"
      ? addDays(today, rule.dayOffset)
      : addDays(today, -rule.dayOffset);
  const rangeStart = kstToInstant(targetDay, "00:00").toISOString();
  const rangeEnd = kstToInstant(addDays(targetDay, 1), "00:00").toISOString();

  let query = supabase
    .from("reservations")
    .select(
      "id, code, customer_name, customer_phone, customer_email, shoot_start, shoot_location, product_id",
    )
    .eq("status", "confirmed")
    .gte("shoot_start", rangeStart)
    .lt("shoot_start", rangeEnd);
  if (rule.productId) query = query.eq("product_id", rule.productId);

  const { data: candidates } = await query;

  let sent = 0;
  for (const reservation of candidates ?? []) {
    if (!reservation.shoot_start) continue;
    if (await hasRuleEmailBeenSent(rule.id, reservation.id)) continue;

    const productName = await getProductName(reservation.product_id);
    const variables = buildEmailVariables({
      customerName: reservation.customer_name,
      productName,
      shootStart: new Date(reservation.shoot_start),
      shootLocation: reservation.shoot_location,
      code: reservation.code,
    });

    const attempted = await sendDayOffsetRuleEmail({
      rule,
      reservationId: reservation.id,
      customerEmail: reservation.customer_email,
      adminEmail,
      variables,
    });
    if (attempted) sent += 1;
  }

  return sent;
}
