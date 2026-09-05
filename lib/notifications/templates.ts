import { kstDateString, kstTimeString, weekdayOf } from "../time";
import { SITE } from "../site";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** "9월 10일(수) 14:00" 형태로 촬영 시각을 안내한다. */
function formatShootTime(shootStart: Date): string {
  const date = kstDateString(shootStart);
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[weekdayOf(date)];
  return `${month}월 ${day}일(${weekday}) ${kstTimeString(shootStart)}`;
}

type ReservationInfo = {
  productName: string;
  shootStart: Date;
  code: string;
};

export function customerRequestedText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] ${info.productName} 예약 신청이 접수됐어요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `확정되면 다시 안내드릴게요.`
  );
}

export function customerConfirmedText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 예약이 확정됐어요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `촬영 전날 다시 안내드릴게요.`
  );
}

export function customerCancelledText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 예약이 취소됐어요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}.`
  );
}

export function customerReminderText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 내일 촬영 예약 안내예요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `늦지 않게 와주세요!`
  );
}

type AdminNewRequestInfo = ReservationInfo & {
  customerName: string;
  customerPhone: string;
};

export function adminNewRequestSubject(): string {
  return `[${SITE.name}] 새 예약 신청이 들어왔어요`;
}

export function adminNewRequestText(info: AdminNewRequestInfo): string {
  return (
    `[${SITE.name}] 새 예약 신청\n` +
    `${info.productName} / ${formatShootTime(info.shootStart)}\n` +
    `${info.customerName} (${info.customerPhone})\n` +
    `예약번호 ${info.code}`
  );
}
