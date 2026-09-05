import "server-only";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { logNotification } from "./log";
import {
  adminNewRequestSubject,
  adminNewRequestText,
  customerCancelledText,
  customerConfirmedText,
  customerRequestedText,
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
  productName: string;
  shootStart: Date;
  code: string;
};

/** 손님: 예약 접수. */
export async function notifyCustomerRequested(
  info: ReservationNotice,
): Promise<void> {
  await trySms({
    purpose: "customer_requested",
    to: info.customerPhone,
    text: customerRequestedText(info),
    reservationId: info.reservationId,
  });
}

/** 손님: 예약 확정. */
export async function notifyCustomerConfirmed(
  info: ReservationNotice,
): Promise<void> {
  await trySms({
    purpose: "customer_confirmed",
    to: info.customerPhone,
    text: customerConfirmedText(info),
    reservationId: info.reservationId,
  });
}

/** 손님: 예약 취소. */
export async function notifyCustomerCancelled(
  info: ReservationNotice,
): Promise<void> {
  await trySms({
    purpose: "customer_cancelled",
    to: info.customerPhone,
    text: customerCancelledText(info),
    reservationId: info.reservationId,
  });
}

/** 손님: 촬영 전날 리마인드 (Vercel Cron에서 호출). */
export async function notifyCustomerReminder(
  info: ReservationNotice,
): Promise<void> {
  await trySms({
    purpose: "customer_reminder",
    to: info.customerPhone,
    text: customerReminderText(info),
    reservationId: info.reservationId,
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
