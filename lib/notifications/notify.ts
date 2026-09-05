import "server-only";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { logNotification } from "./log";
import {
  adminNewRequestSubject,
  adminNewRequestText,
  customerCancelledSubject,
  customerCancelledText,
  customerConfirmedSubject,
  customerConfirmedText,
  customerRequestedSubject,
  customerRequestedText,
  customerReminderSubject,
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

async function tryEmail(params: {
  purpose: string;
  to: string;
  subject: string;
  text: string;
  reservationId?: string | null;
}): Promise<void> {
  try {
    await sendEmail({
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
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

type ReservationNotice = {
  reservationId: string;
  customerPhone: string;
  /** 선택 입력. 있으면 SMS와 함께 이메일로도 보낸다. */
  customerEmail?: string | null;
  productName: string;
  shootStart: Date;
  code: string;
};

/**
 * 손님 알림 공통 처리. SMS는 항상 보내고(연락처는 필수 입력이라 늘 있다),
 * 이메일은 손님이 입력했을 때만 같은 내용으로 추가로 보낸다.
 */
async function notifyCustomer(params: {
  purpose: string;
  info: ReservationNotice;
  smsText: string;
  emailSubject: string;
}): Promise<void> {
  const tasks: Promise<void>[] = [
    trySms({
      purpose: params.purpose,
      to: params.info.customerPhone,
      text: params.smsText,
      reservationId: params.info.reservationId,
    }),
  ];

  if (params.info.customerEmail) {
    tasks.push(
      tryEmail({
        purpose: params.purpose,
        to: params.info.customerEmail,
        subject: params.emailSubject,
        text: params.smsText,
        reservationId: params.info.reservationId,
      }),
    );
  }

  await Promise.all(tasks);
}

/** 손님: 예약 접수. */
export async function notifyCustomerRequested(
  info: ReservationNotice,
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_requested",
    info,
    smsText: customerRequestedText(info),
    emailSubject: customerRequestedSubject(),
  });
}

/** 손님: 예약 확정. */
export async function notifyCustomerConfirmed(
  info: ReservationNotice,
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_confirmed",
    info,
    smsText: customerConfirmedText(info),
    emailSubject: customerConfirmedSubject(),
  });
}

/** 손님: 예약 취소. */
export async function notifyCustomerCancelled(
  info: ReservationNotice,
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_cancelled",
    info,
    smsText: customerCancelledText(info),
    emailSubject: customerCancelledSubject(),
  });
}

/** 손님: 촬영 전날 리마인드 (Vercel Cron에서 호출). */
export async function notifyCustomerReminder(
  info: ReservationNotice,
): Promise<void> {
  await notifyCustomer({
    purpose: "customer_reminder",
    info,
    smsText: customerReminderText(info),
    emailSubject: customerReminderSubject(),
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
  shootStart: Date;
  code: string;
}): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (info.adminPhone) {
    tasks.push(
      trySms({
        purpose: "admin_new_request",
        to: info.adminPhone,
        text: adminNewRequestText(info),
        reservationId: info.reservationId,
      }),
    );
  }

  if (info.adminEmail) {
    tasks.push(
      tryEmail({
        purpose: "admin_new_request",
        to: info.adminEmail,
        subject: adminNewRequestSubject(),
        text: adminNewRequestText(info),
        reservationId: info.reservationId,
      }),
    );
  }

  await Promise.all(tasks);
}
