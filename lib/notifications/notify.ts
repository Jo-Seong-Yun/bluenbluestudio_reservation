import "server-only";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { sendKakaoAlimtalk } from "./kakao";
import { logNotification } from "./log";
import {
  loadEmailRulesForTrigger,
  renderEmailTemplate,
  type EmailRule,
  type EmailTriggerType,
} from "./email-rules";
import { createAdminClient } from "../supabase/admin";
import {
  smsNotificationsEnabled,
  solapiKakaoPfId,
  solapiKakaoTemplateId,
  type KakaoNotificationPurpose,
} from "./env";
import {
  adminNewRequestKakaoVariables,
  adminNewRequestText,
  buildEmailVariables,
  customerCancelledKakaoVariables,
  customerCancelledText,
  customerConfirmedKakaoVariables,
  customerConfirmedText,
  customerReminderKakaoVariables,
  customerRequestedKakaoVariables,
  customerRequestedText,
  customerRescheduledKakaoVariables,
  customerRescheduledText,
  customerReminderText,
} from "./templates";

/**
 * 알림 발송 진입점.
 *
 * 예약 흐름(손님 신청, 관리자 확정/취소)은 알림이 실패해도 절대 멈추면
 * 안 된다 — 그래서 여기 함수들은 아무것도 throw하지 않는다. 실패는
 * notification_logs에 남기고 조용히 넘어간다("발송 실패 로깅").
 */
async function trySms(params: {
  purpose: string;
  to: string;
  text: string;
  reservationId?: string | null;
}): Promise<void> {
  try {
    await sendSms({ to: params.to, text: params.text });
    await logNotification({
      channel: "sms",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: true,
    }).catch(() => {});
  } catch (error) {
    await logNotification({
      channel: "sms",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
  }
}

/**
 * 카카오 알림톡을 시도한다. pfId·템플릿ID가 아직 설정 안 됐으면(카카오
 * 채널·템플릿 심사 전) false를 돌려주고 아무것도 하지 않는다 — 호출하는
 * 쪽(notifyCustomer/notifyAdminNewRequest)은 이때 기존처럼 SMS를 보낸다.
 * true를 돌려줬다는 건 "알림톡 발송을 시도했다"는 뜻으로, 실패해도
 * 솔라피가 자동으로 문자 대체 발송을 하므로 여기서 SMS를 또 보내지
 * 않는다(kakao.ts의 disableSms: false).
 */
async function tryKakao(params: {
  purpose: KakaoNotificationPurpose;
  to: string;
  variables: Record<string, string>;
  fallbackText: string;
  reservationId?: string | null;
}): Promise<boolean> {
  const pfId = solapiKakaoPfId();
  const templateId = solapiKakaoTemplateId(params.purpose);
  if (!pfId || !templateId) return false;

  try {
    await sendKakaoAlimtalk({
      to: params.to,
      pfId,
      templateId,
      variables: params.variables,
      fallbackText: params.fallbackText,
    });
    await logNotification({
      channel: "kakao",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: true,
    }).catch(() => {});
  } catch (error) {
    await logNotification({
      channel: "kakao",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
  }
  return true;
}

/**
 * 규칙(email_rules) 하나를 실제로 발송한다. purpose는
 * `rule:<규칙 id>`로 남겨, 나중에 같은 규칙이 같은 예약에 이미
 * 발송됐는지(촬영일 기준 며칠 전/후 규칙의 중복 발송 방지) 조회할 수
 * 있게 한다(hasRuleEmailBeenSent 참고).
 */
async function tryRuleEmail(params: {
  rule: EmailRule;
  to: string;
  variables: Record<string, string>;
  reservationId?: string | null;
}): Promise<void> {
  try {
    const subject = renderEmailTemplate(params.rule.subject, params.variables);
    const text = renderEmailTemplate(params.rule.body, params.variables);
    await sendEmail({ to: params.to, subject, text });
    await logNotification({
      channel: "email",
      purpose: `rule:${params.rule.id}`,
      recipient: params.to,
      reservationId: params.reservationId,
      success: true,
    }).catch(() => {});
  } catch (error) {
    await logNotification({
      channel: "email",
      purpose: `rule:${params.rule.id}`,
      recipient: params.to,
      reservationId: params.reservationId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
  }
}

/**
 * 특정 이벤트(접수/확정/취소/일정변경/관리자 신규알림)가 일어난 순간
 * 이메일을 보낸다. 관리자가 /admin/settings의 "이메일 규칙"에서 이
 * 트리거에 걸어둔 규칙을 전부 찾아(상품 필터가 있으면 이 발송 건의
 * 상품과 맞는 것만), 규칙마다 정해진 수신자(손님/사장님)에게 각각
 * 보낸다. 걸린 규칙이 하나도 없으면(관리자가 다 지웠으면) 조용히
 * 아무것도 보내지 않는다 — "종류를 마음대로 삭제할 수 있다"는 요구의
 * 자연스러운 결과다.
 */
async function sendTriggerEmails(params: {
  triggerType: EmailTriggerType;
  productId: string | null;
  reservationId?: string | null;
  customerEmail?: string | null;
  adminEmail?: string | null;
  variables: Record<string, string>;
}): Promise<void> {
  const rules = await loadEmailRulesForTrigger(params.triggerType, params.productId);
  await Promise.all(
    rules.map((rule) => {
      const to = rule.recipient === "admin" ? params.adminEmail : params.customerEmail;
      if (!to) return Promise.resolve();
      return tryRuleEmail({
        rule,
        to,
        variables: params.variables,
        reservationId: params.reservationId,
      });
    }),
  );
}

/**
 * SMS·알림톡 없이 이메일 규칙만 있는 상태 전환(입금확인/완료/노쇼)에
 * 쓴다 — 이 셋은 아직 심사받은 SMS·알림톡 문구가 없어, 관리자가
 * /admin/emails에서 직접 만든 이메일 규칙이 있을 때만 그 규칙대로
 * 나간다(규칙이 없으면 sendTriggerEmails가 조용히 아무것도 안 보낸다).
 */
export async function notifyEmailOnlyEvent(params: {
  triggerType: EmailTriggerType;
  reservationId: string;
  productId: string;
  customerEmail?: string | null;
  adminEmail?: string | null;
  variables: Record<string, string>;
}): Promise<void> {
  await sendTriggerEmails({
    triggerType: params.triggerType,
    productId: params.productId,
    reservationId: params.reservationId,
    customerEmail: params.customerEmail,
    adminEmail: params.adminEmail,
    variables: params.variables,
  });
}

/**
 * 촬영일 기준 며칠 전/후 규칙 하나를 특정 예약에 보낸다. 크론
 * (app/api/cron/reminders/route.ts)이 매일 규칙 전체를 훑으며 이
 * 함수를 부른다. 이미 보낸 적 있으면(hasRuleEmailBeenSent) 크론 쪽에서
 * 미리 걸러 부르지 않으므로 여기선 발송 여부만 따진다.
 */
export async function sendDayOffsetRuleEmail(params: {
  rule: EmailRule;
  reservationId: string;
  customerEmail?: string | null;
  adminEmail?: string | null;
  variables: Record<string, string>;
}): Promise<boolean> {
  const to = params.rule.recipient === "admin" ? params.adminEmail : params.customerEmail;
  if (!to) return false;
  await tryRuleEmail({
    rule: params.rule,
    to,
    variables: params.variables,
    reservationId: params.reservationId,
  });
  return true;
}

/** 이 규칙이 이 예약에 이미 발송됐는지(성공 기준) — 크론의 중복 발송 방지용. */
export async function hasRuleEmailBeenSent(
  ruleId: string,
  reservationId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("channel", "email")
    .eq("purpose", `rule:${ruleId}`)
    .eq("reservation_id", reservationId)
    .eq("success", true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

type CustomerContact = {
  reservationId: string;
  customerPhone: string;
  /** 선택 입력. 있으면 SMS와 함께 이메일로도 보낸다. */
  customerEmail?: string | null;
  /** 이 이벤트에 사장님용 이메일 규칙이 걸려 있을 수 있어 항상 같이 넘긴다. */
  adminEmail?: string | null;
  /** 상품 필터가 걸린 이메일 규칙을 가려내는 데 쓴다. */
  productId: string;
};

type ReservationNotice = CustomerContact & {
  productName: string;
  shootStart: Date;
  code: string;
  /** 관리자가 예약 상세에서 입력한 촬영 장소. 리마인드류 메일에서만 쓴다. */
  shootLocation?: string | null;
};

/**
 * 손님 알림 공통 처리. 카카오 알림톡이 설정돼 있으면(pfId+템플릿ID)
 * 그걸로 먼저 시도하고, 아직 안 됐으면 SMS로 보낸다 — 단, SMS는 건당
 * 비용이 들어 `SOLAPI_SMS_ENABLED=false`로 꺼둘 수 있고, 꺼져 있으면
 * 카카오도 안 됐을 때 손님 연락처로는 아무것도 안 나간다(이메일은 이
 * 스위치와 무관하게 항상 그대로 나간다). email 인자를 넘긴 경우에만
 * 그 트리거에 걸린 이메일 규칙을 찾아 발송한다(리마인드처럼 이벤트가
 * 아니라 촬영일 기준 시간차로 도는 것은 이 함수를 거치지 않는다).
 */
async function notifyCustomer(params: {
  purpose: KakaoNotificationPurpose;
  info: CustomerContact;
  smsText: string;
  kakaoVariables: Record<string, string>;
  email?: {
    triggerType: EmailTriggerType;
    variables: Record<string, string>;
  };
}): Promise<void> {
  const kakaoAttempted = await tryKakao({
    purpose: params.purpose,
    to: params.info.customerPhone,
    variables: params.kakaoVariables,
    fallbackText: params.smsText,
    reservationId: params.info.reservationId,
  });

  const tasks: Promise<void>[] = [];

  if (!kakaoAttempted && smsNotificationsEnabled()) {
    tasks.push(
      trySms({
        purpose: params.purpose,
        to: params.info.customerPhone,
        text: params.smsText,
        reservationId: params.info.reservationId,
      }),
    );
  }

  if (params.email) {
    tasks.push(
      sendTriggerEmails({
        triggerType: params.email.triggerType,
        productId: params.info.productId,
        reservationId: params.info.reservationId,
        customerEmail: params.info.customerEmail,
        adminEmail: params.info.adminEmail,
        variables: params.email.variables,
      }),
    );
  }

  await Promise.all(tasks);
}

/** 손님: 예약 접수. 확정 전이라 시간 하나가 아니라 후보(1~3개)를 안내한다. */
export async function notifyCustomerRequested(
  info: CustomerContact & {
    customerName: string;
    productName: string;
    candidateTimes: Date[];
    code: string;
    bankAccount?: string | null;
    notice?: string | null;
  },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_requested",
    info,
    smsText: customerRequestedText(info),
    kakaoVariables: customerRequestedKakaoVariables(info),
    email: {
      triggerType: "on_requested",
      variables: buildEmailVariables(info),
    },
  });
}

/** 손님: 예약 일정 확정(입금 확인 전 단계). */
export async function notifyCustomerConfirmed(
  info: ReservationNotice & { customerName: string },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_confirmed",
    info,
    smsText: customerConfirmedText(info),
    kakaoVariables: customerConfirmedKakaoVariables(info),
    email: {
      triggerType: "on_schedule_confirmed",
      variables: buildEmailVariables(info),
    },
  });
}

/**
 * 손님: 예약 취소. 확정 전(후보만 낸 상태)에 취소될 수도 있어 shootStart가
 * null일 수 있다 — 그땐 "몇 시 예약"이 아니라 예약번호만으로 안내한다.
 */
export async function notifyCustomerCancelled(
  info: CustomerContact & {
    customerName: string;
    productName: string;
    shootStart: Date | null;
    code: string;
  },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_cancelled",
    info,
    smsText: customerCancelledText(info),
    kakaoVariables: customerCancelledKakaoVariables(info),
    email: {
      triggerType: "on_cancelled",
      variables: buildEmailVariables(info),
    },
  });
}

/**
 * 손님: 예약 일정 변경. 관리자가 확정된 예약의 날짜·시간을 직접
 * 바꿨을 때(app/admin/actions.ts의 rescheduleReservation)만 보낸다 —
 * 손님이 스스로 바꾸는 경로는 없다(취소 후 재신청만 가능).
 */
export async function notifyCustomerRescheduled(
  info: CustomerContact & {
    customerName: string;
    productName: string;
    oldShootStart: Date;
    newShootStart: Date;
    code: string;
  },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_rescheduled",
    info,
    smsText: customerRescheduledText(info),
    kakaoVariables: customerRescheduledKakaoVariables(info),
    email: {
      triggerType: "on_rescheduled",
      variables: buildEmailVariables(info),
    },
  });
}

/**
 * 손님: 촬영 전날 리마인드 (Vercel Cron에서 호출). SMS·알림톡만 여기서
 * 보낸다 — 이메일은 "촬영 며칠 전" 이메일 규칙(days_before_shoot)을
 * 크론이 별도로 훑어 보내므로(day_offset을 관리자가 자유롭게 바꿀 수
 * 있어 "내일"에 고정되지 않는다) 이 함수를 거치지 않는다.
 */
export async function notifyCustomerReminder(
  info: ReservationNotice & { customerName: string },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_reminder",
    info,
    smsText: customerReminderText(info),
    kakaoVariables: customerReminderKakaoVariables(info),
  });
}

/**
 * 사장님: 새 예약 신청 즉시 알림.
 * settings.admin_notify_phone / admin_notify_email 중 채워진 채널로만 보낸다.
 * 하나도 안 채워져 있으면 아무 일도 하지 않는다(로그도 남기지 않는다 —
 * 미설정은 실패가 아니라 그냥 아직 안 쓰는 기능이다). 이메일은 그와
 * 별개로, "새 예약 신청 시" 트리거에 걸린 이메일 규칙을 따로 찾아
 * 보낸다(수신자를 사장님이 아니라 손님으로 걸어둔 규칙은 이 함수에는
 * 손님 이메일이 없어 자동으로 무시된다).
 */
export async function notifyAdminNewRequest(info: {
  reservationId: string;
  productId: string;
  adminPhone: string | null;
  adminEmail: string | null;
  customerName: string;
  customerPhone: string;
  productName: string;
  candidateTimes: Date[];
  code: string;
}): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (info.adminPhone) {
    const kakaoAttempted = await tryKakao({
      purpose: "admin_new_request",
      to: info.adminPhone,
      variables: adminNewRequestKakaoVariables(info),
      fallbackText: adminNewRequestText(info),
      reservationId: info.reservationId,
    });

    if (!kakaoAttempted && smsNotificationsEnabled()) {
      tasks.push(
        trySms({
          purpose: "admin_new_request",
          to: info.adminPhone,
          text: adminNewRequestText(info),
          reservationId: info.reservationId,
        }),
      );
    }
  }

  tasks.push(
    sendTriggerEmails({
      triggerType: "on_admin_new_request",
      productId: info.productId,
      reservationId: info.reservationId,
      adminEmail: info.adminEmail,
      variables: buildEmailVariables(info),
    }),
  );

  await Promise.all(tasks);
}
