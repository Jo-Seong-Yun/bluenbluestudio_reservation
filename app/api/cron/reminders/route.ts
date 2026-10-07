import { randomUUID } from "node:crypto";
import { scheduledEmailIsDue } from "@/lib/notifications/email-schedule";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, kstToday, kstToInstant, kstTimeString } from "@/lib/time";
import {
  hasRuleEmailBeenSent,
  notifyCustomerReminder,
  sendDayOffsetRuleEmail,
} from "@/lib/notifications/notify";
import {
  loadDayOffsetEmailRules,
  ruleRecipientAddresses,
  type EmailRule,
} from "@/lib/notifications/email-rules";
import { getAdminNotifyEmail } from "@/lib/notifications/admin-contact";
import { buildEmailVariables } from "@/lib/notifications/templates";
import { getProductName } from "@/lib/notifications/product-name";
import { loadSelectedPricedOptions } from "@/lib/booking/custom-fields";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 촬영 전날 리마인드 + 촬영일 기준 이메일 규칙 스윕. Vercel Cron이
 * 매분 호출한다(vercel.json의 crons 항목).
 *
 * Vercel Cron 요청에는 자동으로 `Authorization: Bearer $CRON_SECRET`이
 * 실린다. 이 라우트는 그 값을 확인해, 경로를 알아도 남이 그냥 호출하지
 * 못하게 막는다.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const token = randomUUID();
  const { data: claimed, error: lockError } = await supabase.rpc(
    "claim_reminder_cron",
    { p_token: token },
  );
  if (lockError)
    return NextResponse.json(
      { error: "발송 잠금을 획득하지 못했습니다." },
      { status: 500 },
    );
  if (!claimed) return NextResponse.json({ skipped: "already_running" });
  try {
    return await runReminders();
  } catch (error) {
    console.error("예약 자동 안내 실패", error);
    return NextResponse.json(
      { error: "자동 안내 실행에 실패했습니다." },
      { status: 500 },
    );
  } finally {
    const { error } = await supabase.rpc("release_reminder_cron", {
      p_token: token,
    });
    if (error) console.error("자동 안내 잠금 해제 실패", error);
  }
}

async function runReminders() {
  const supabase = createAdminClient();
  const now = new Date();

  // 확정(confirmed)된 예약 중 "내일" 촬영인 것만, 아직 안 보낸 것만
  // (`reminded_at is null`) 골라 SMS·알림톡을 보낸다 — 크론이 재시도
  // 등으로 하루에 두 번 불려도 중복 발송되지 않게 막는 장치다. 이메일은
  // 아래 이메일 규칙 스윕이 따로 담당한다(day_offset을 관리자가 자유롭게
  // 바꿀 수 있어 "내일"에 고정되지 않는다).
  const tomorrow = addDays(kstToday(now), 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);
  const rangeStart = kstToInstant(tomorrow, "00:00").toISOString();
  const rangeEnd = kstToInstant(dayAfterTomorrow, "00:00").toISOString();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(
      "id, code, customer_name, customer_phone, shoot_start, shoot_location, product_id",
    )
    .in("status", ["schedule_confirmed", "payment_confirmed"])
    .is("reminded_at", null)
    .gte("shoot_start", rangeStart)
    .lt("shoot_start", rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const reservation of kstTimeString(now) >= "19:00"
    ? (reservations ?? [])
    : []) {
    // schedule_confirmed/payment_confirmed 조건으로 걸러 왔으니
    // shoot_start는 항상 있다(아직 후보만 낸 requested 상태만 null일
    // 수 있다).
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
 * 촬영일/촬영 시각 기준 이메일 규칙 중 발송 시각에 도달한 확정 예약을 찾아 보낸다. 같은 규칙이 같은 예약에 두 번
 * 나가지 않게 notification_logs로 이미 보낸 적 있는지 먼저 확인한다
 * (hasRuleEmailBeenSent) — 리마인드처럼 예약에 플래그 컬럼 하나를 두는
 * 방식은 규칙이 여러 개일 수 있어 쓸 수 없다.
 */
async function sweepDayOffsetEmailRules(): Promise<number> {
  const rules = await loadDayOffsetEmailRules();
  if (rules.length === 0) return 0;

  const supabase = createAdminClient();
  const adminEmail = await getAdminNotifyEmail();
  const now = new Date();
  let sent = 0;

  for (const rule of rules) {
    sent += await sendRuleToTargetDay(supabase, rule, now, adminEmail);
  }

  return sent;
}

async function sendRuleToTargetDay(
  supabase: ReturnType<typeof createAdminClient>,
  rule: EmailRule,
  now: Date,
  adminEmail: string | null,
): Promise<number> {
  // 단일 날짜 조회는 시간 기준/지연 실행을 놓치므로 확정 예약을 모두 페이지로 읽습니다.
  const candidates = [];
  for (let from = 0; ; from += 500) {
    let query = supabase
      .from("reservations")
      .select(
        "id, code, customer_name, customer_phone, customer_email, team_emails, shoot_start, shoot_location, product_id, estimated_amount",
      )
      .in("status", ["schedule_confirmed", "payment_confirmed"])
      .not("shoot_start", "is", null)
      .order("id")
      .range(from, from + 499);
    if (rule.productId) query = query.eq("product_id", rule.productId);
    const { data, error } = await query;
    if (error) throw error;
    candidates.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }

  let sent = 0;
  for (const reservation of candidates ?? []) {
    if (
      !reservation.shoot_start ||
      !scheduledEmailIsDue(rule, reservation.shoot_start, now)
    )
      continue;

    const unsent: string[] = [];
    for (const to of ruleRecipientAddresses(rule.recipients, {
      customerEmail: reservation.customer_email,
      adminEmail,
      teamEmails: reservation.team_emails ?? [],
    })) {
      if (!(await hasRuleEmailBeenSent(rule.id, reservation.id, to)))
        unsent.push(to);
    }
    if (unsent.length === 0) continue;

    const [productName, selectedOptions] = await Promise.all([
      getProductName(reservation.product_id),
      loadSelectedPricedOptions(reservation.id),
    ]);
    const variables = buildEmailVariables({
      customerName: reservation.customer_name,
      productName,
      shootStart: new Date(reservation.shoot_start),
      shootLocation: reservation.shoot_location,
      code: reservation.code,
      estimatedAmount: reservation.estimated_amount,
      selectedOptions,
    });

    await sendDayOffsetRuleEmail({
      rule,
      reservationId: reservation.id,
      to: unsent,
      variables,
    });
    sent += 1;
  }

  return sent;
}
