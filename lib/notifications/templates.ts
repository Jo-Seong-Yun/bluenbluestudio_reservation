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

/** "1지망 9월 12일(토) 10:00 / 2지망 9월 13일(일) 14:00" 형태로 후보를 나열한다. */
function formatCandidateList(candidateTimes: Date[]): string {
  const labels = ["1지망", "2지망", "3지망"];
  return candidateTimes
    .map((time, i) => `${labels[i]} ${formatShootTime(time)}`)
    .join(" / ");
}

type ReservationInfo = {
  productName: string;
  shootStart: Date;
  code: string;
};

/**
 * 접수 시점엔 아직 하나로 정해지지 않고 1~3개의 희망 시간(후보)만 있다
 * — 관리자가 그중 하나를 골라야 진짜 촬영 시각(ReservationInfo.shootStart)이
 * 생긴다. 그래서 접수 알림만 별도 타입을 쓴다.
 */
type ReservationRequestInfo = {
  productName: string;
  candidateTimes: Date[];
  code: string;
};

export function customerRequestedSubject(): string {
  return `[${SITE.name}] 예약 신청이 접수됐어요`;
}

export function customerRequestedText(info: ReservationRequestInfo): string {
  return (
    `[${SITE.name}] ${info.productName} 예약 신청이 접수됐어요. ` +
    `희망시간 ${formatCandidateList(info.candidateTimes)}, 예약번호 ${info.code}. ` +
    `이 중 하나로 확정되면 다시 안내드릴게요.`
  );
}

type ReservationRequestedEmailInfo = ReservationRequestInfo & {
  bankAccount?: string | null;
  notice?: string | null;
};

/**
 * 손님용 "예약 접수" 이메일 본문. SMS는 글자 수 제한 때문에 짧게 줄이지만,
 * 이메일은 예약완료 화면과 같은 수준으로 입금 계좌·안내사항까지 담는다.
 */
export function customerRequestedEmailText(
  info: ReservationRequestedEmailInfo,
): string {
  const lines = [
    `${info.productName} 예약 신청이 접수되었습니다.`,
    "",
    "희망 시간(이 중 하나로 확정돼요):",
    ...info.candidateTimes.map(
      (time, i) => `  ${i + 1}지망: ${formatShootTime(time)}`,
    ),
    "",
    `예약번호: ${info.code}`,
    "",
    "예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 " +
      "입금하시면 예약이 최종 확정됩니다.",
  ];

  if (info.bankAccount) {
    lines.push("", `입금 계좌: ${info.bankAccount}`);
  }

  if (info.notice) {
    lines.push("", info.notice);
  }

  return lines.join("\n");
}

export function customerConfirmedSubject(): string {
  return `[${SITE.name}] 예약이 확정됐어요`;
}

export function customerConfirmedText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 예약이 확정됐어요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `촬영 전날 다시 안내드릴게요.`
  );
}

export function customerCancelledSubject(): string {
  return `[${SITE.name}] 예약이 취소됐어요`;
}

type ReservationCancelledInfo = {
  productName: string;
  /** 확정되기 전(후보만 낸 채) 취소된 경우 null — 촬영 시각 자체가 없었다. */
  shootStart: Date | null;
  code: string;
};

export function customerCancelledText(info: ReservationCancelledInfo): string {
  const timePart = info.shootStart
    ? `${formatShootTime(info.shootStart)}, `
    : "";
  return `[${SITE.name}] 예약이 취소됐어요. ${timePart}예약번호 ${info.code}.`;
}

export function customerReminderSubject(): string {
  return `[${SITE.name}] 내일 촬영 예약 안내`;
}

export function customerReminderText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 내일 촬영 예약 안내예요. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `늦지 않게 와주세요!`
  );
}

type AdminNewRequestInfo = ReservationRequestInfo & {
  customerName: string;
  customerPhone: string;
};

export function adminNewRequestSubject(): string {
  return `[${SITE.name}] 새 예약 신청이 들어왔어요`;
}

export function adminNewRequestText(info: AdminNewRequestInfo): string {
  return (
    `[${SITE.name}] 새 예약 신청\n` +
    `${info.productName}\n` +
    `희망시간: ${formatCandidateList(info.candidateTimes)}\n` +
    `${info.customerName} (${info.customerPhone})\n` +
    `예약번호 ${info.code}`
  );
}

/**
 * 카카오 알림톡 템플릿 변수. 알림톡은 SMS처럼 자유 문구를 못 보내고,
 * 카카오 심사를 통과한 고정 문구의 빈칸(`#{변수명}`)만 채워 보낸다 —
 * 그래서 위 SMS 문구 함수들과 별도로 "변수 이름 → 값" 맵을 만든다.
 *
 * 여기 적은 변수 이름(상품명/일시/예약번호 등)은 심사 신청 초안일 뿐이다.
 * 실제 심사를 통과한 템플릿의 변수 이름과 정확히 일치해야 발송이 되므로,
 * 심사 결과가 나오면 이 함수들의 키를 그에 맞게 고쳐야 한다
 * (lib/notifications/kakao.ts 참고).
 */
export function customerRequestedKakaoVariables(
  info: ReservationRequestInfo,
): Record<string, string> {
  const [t1, t2, t3] = info.candidateTimes;
  return {
    "#{상품명}": info.productName,
    "#{1지망}": t1 ? formatShootTime(t1) : "-",
    "#{2지망}": t2 ? formatShootTime(t2) : "-",
    "#{3지망}": t3 ? formatShootTime(t3) : "-",
    "#{예약번호}": info.code,
  };
}

export function customerConfirmedKakaoVariables(
  info: ReservationInfo,
): Record<string, string> {
  return {
    "#{상품명}": info.productName,
    "#{일시}": formatShootTime(info.shootStart),
    "#{예약번호}": info.code,
  };
}

export function customerCancelledKakaoVariables(
  info: ReservationCancelledInfo,
): Record<string, string> {
  return {
    "#{상품명}": info.productName,
    "#{일시}": info.shootStart ? formatShootTime(info.shootStart) : "-",
    "#{예약번호}": info.code,
  };
}

export function customerReminderKakaoVariables(
  info: ReservationInfo,
): Record<string, string> {
  return {
    "#{상품명}": info.productName,
    "#{일시}": formatShootTime(info.shootStart),
    "#{예약번호}": info.code,
  };
}

export function adminNewRequestKakaoVariables(
  info: AdminNewRequestInfo,
): Record<string, string> {
  const [t1, t2, t3] = info.candidateTimes;
  return {
    "#{상품명}": info.productName,
    "#{1지망}": t1 ? formatShootTime(t1) : "-",
    "#{2지망}": t2 ? formatShootTime(t2) : "-",
    "#{3지망}": t3 ? formatShootTime(t3) : "-",
    "#{예약번호}": info.code,
    "#{손님이름}": info.customerName,
    "#{손님연락처}": info.customerPhone,
  };
}
