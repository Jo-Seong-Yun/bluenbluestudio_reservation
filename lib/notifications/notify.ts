import "server-only";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { sendKakaoAlimtalk } from "./kakao";
import { logNotification } from "./log";
import { loadEmailTemplate, renderEmailTemplate } from "./email-templates";
import {
  smsNotificationsEnabled,
  solapiKakaoPfId,
  solapiKakaoTemplateId,
  type KakaoNotificationPurpose,
} from "./env";
import {
  adminNewRequestEmailVariables,
  adminNewRequestKakaoVariables,
  adminNewRequestSubject,
  adminNewRequestText,
  customerCancelledKakaoVariables,
  customerCancelledSubject,
  customerCancelledText,
  customerConfirmedKakaoVariables,
  customerConfirmedSubject,
  customerConfirmedText,
  customerReminderKakaoVariables,
  customerRequestedEmailText,
  customerRequestedEmailVariables,
  customerRequestedKakaoVariables,
  customerRequestedSubject,
  customerRequestedText,
  customerRescheduledEmailVariables,
  customerRescheduledKakaoVariables,
  customerRescheduledSubject,
  customerRescheduledText,
  customerReminderSubject,
  customerReminderText,
  reservationEmailVariables,
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
 * 이메일 발송. /admin/settings에서 관리자가 이 목적(purpose)의 문구를
 * 직접 고쳐뒀으면 그 subject/body에 변수를 채워 넣어 쓰고, 아직 안
 * 고쳤으면(DB에 행이 없으면) 코드에 남아있는 기본 문구로 조용히
 * 되돌아간다 — 관리자 화면을 한 번도 안 열어본 사장님도 발송 자체는
 * 그대로 되어야 한다.
 */
async function tryEmail(params: {
  purpose: KakaoNotificationPurpose;
  to: string;
  variables: Record<string, string>;
  fallbackSubject: string;
  fallbackText: string;
  reservationId?: string | null;
}): Promise<void> {
  try {
    const custom = await loadEmailTemplate(params.purpose);
    const subject = custom
      ? renderEmailTemplate(custom.subject, params.variables)
      : params.fallbackSubject;
    const text = custom
      ? renderEmailTemplate(custom.body, params.variables)
      : params.fallbackText;

    await sendEmail({ to: params.to, subject, text });
    await logNotification({
      channel: "email",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: true,
    }).catch(() => {});
  } catch (error) {
    await logNotification({
      channel: "email",
      purpose: params.purpose,
      recipient: params.to,
      reservationId: params.reservationId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
  }
}

type CustomerContact = {
  reservationId: string;
  customerPhone: string;
  /** 선택 입력. 있으면 SMS와 함께 이메일로도 보낸다. */
  customerEmail?: string | null;
};

type ReservationNotice = CustomerContact & {
  productName: string;
  shootStart: Date;
  code: string;
};

/**
 * 손님 알림 공통 처리. 카카오 알림톡이 설정돼 있으면(pfId+템플릿ID)
 * 그걸로 먼저 시도하고, 아직 안 됐으면 SMS로 보낸다 — 단, SMS는 건당
 * 비용이 들어 `SOLAPI_SMS_ENABLED=false`로 꺼둘 수 있고, 꺼져 있으면
 * 카카오도 안 됐을 때 손님 연락처로는 아무것도 안 나간다(이메일은 이
 * 스위치와 무관하게 항상 그대로 나간다). 이메일은 손님이 입력했을 때만
 * 추가로 보낸다. emailVariables는 관리자가 /admin/settings에서 고친
 * {{변수}} 문구를 채우는 데 쓰고, DB에 커스텀 문구가 없을 때는
 * emailText(없으면 smsText)로 되돌아간다.
 */
async function notifyCustomer(params: {
  purpose: KakaoNotificationPurpose;
  info: CustomerContact;
  smsText: string;
  kakaoVariables: Record<string, string>;
  emailSubject: string;
  emailText?: string;
  emailVariables: Record<string, string>;
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

  if (params.info.customerEmail) {
    tasks.push(
      tryEmail({
        purpose: params.purpose,
        to: params.info.customerEmail,
        variables: params.emailVariables,
        fallbackSubject: params.emailSubject,
        fallbackText: params.emailText ?? params.smsText,
        reservationId: params.info.reservationId,
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
    emailSubject: customerRequestedSubject(),
    emailText: customerRequestedEmailText(info),
    emailVariables: customerRequestedEmailVariables(info),
  });
}

/** 손님: 예약 확정. */
export async function notifyCustomerConfirmed(
  info: ReservationNotice & { customerName: string },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_confirmed",
    info,
    smsText: customerConfirmedText(info),
    kakaoVariables: customerConfirmedKakaoVariables(info),
    emailSubject: customerConfirmedSubject(),
    emailVariables: reservationEmailVariables(info),
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
    emailSubject: customerCancelledSubject(),
    emailVariables: reservationEmailVariables(info),
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
    emailSubject: customerRescheduledSubject(),
    emailVariables: customerRescheduledEmailVariables(info),
  });
}

/** 손님: 촬영 전날 리마인드 (Vercel Cron에서 호출). */
export async function notifyCustomerReminder(
  info: ReservationNotice & { customerName: string },
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_reminder",
    info,
    smsText: customerReminderText(info),
    kakaoVariables: customerReminderKakaoVariables(info),
    emailSubject: customerReminderSubject(),
    emailVariables: reservationEmailVariables(info),
  });
}

/**
 * 사장님: 새 예약 신청 즉시 알림.
 * settings.admin_notify_phone / admin_notify_email 중 채워진 채널로만 보낸다.
 * 하나도 안 채워져 있으면 아무 일도 하지 않는다(로그도 남기지 않는다 —
 * 미설정은 실패가 아니라 그냥 아직 안 쓰는 기능이다).
 */
export async function notifyAdminNewRequest(info: {
  reservationId: string;
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

  if (info.adminEmail) {
    tasks.push(
      tryEmail({
        purpose: "admin_new_request",
        to: info.adminEmail,
        variables: adminNewRequestEmailVariables(info),
        fallbackSubject: adminNewRequestSubject(),
        fallbackText: adminNewRequestText(info),
        reservationId: info.reservationId,
      }),
    );
  }

  await Promise.all(tasks);
}
