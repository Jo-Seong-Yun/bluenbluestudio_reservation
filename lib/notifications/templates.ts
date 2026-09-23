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

/**
 * 이메일 본문의 {{후보목록}} 변수용. SMS는 한 줄에 다 욱여넣어야 해서
 * " / "로 이어 붙이지만, 이메일은 줄 수 제한이 없으니 각 지망을 한
 * 줄씩 보여준다.
 */
function formatCandidateListMultiline(candidateTimes: Date[]): string {
  const labels = ["1지망", "2지망", "3지망"];
  return candidateTimes
    .map((time, i) => `${labels[i]}: ${formatShootTime(time)}`)
    .join("\n");
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

export function customerRequestedText(info: ReservationRequestInfo): string {
  return (
    `[${SITE.name}] ${info.productName} 예약 신청이 접수되었습니다. ` +
    `희망시간 ${formatCandidateList(info.candidateTimes)}, 예약번호 ${info.code}. ` +
    `이 중 하나로 확정되면 다시 안내드리겠습니다.`
  );
}

export function customerConfirmedText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 예약이 확정되었습니다. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `촬영 전날 다시 안내드리겠습니다.`
  );
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
  return `[${SITE.name}] 예약이 취소되었습니다. ${timePart}예약번호 ${info.code}.`;
}

type ReservationRescheduledInfo = {
  productName: string;
  oldShootStart: Date;
  newShootStart: Date;
  code: string;
};

/** 관리자가 확정된 예약의 일정을 직접 바꿨을 때 손님에게 보내는 안내. */
export function customerRescheduledText(
  info: ReservationRescheduledInfo,
): string {
  return (
    `[${SITE.name}] 예약 일정이 변경되었습니다. ` +
    `기존 ${formatShootTime(info.oldShootStart)} → 변경 ${formatShootTime(info.newShootStart)}, ` +
    `예약번호 ${info.code}.`
  );
}

export function customerReminderText(info: ReservationInfo): string {
  return (
    `[${SITE.name}] 내일 촬영 예약 안내입니다. ` +
    `${formatShootTime(info.shootStart)}, 예약번호 ${info.code}. ` +
    `늦지 않게 와주시기 바랍니다.`
  );
}

type AdminNewRequestInfo = ReservationRequestInfo & {
  customerName: string;
  customerPhone: string;
};

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

export function customerRescheduledKakaoVariables(
  info: ReservationRescheduledInfo,
): Record<string, string> {
  return {
    "#{상품명}": info.productName,
    "#{기존일시}": formatShootTime(info.oldShootStart),
    "#{변경일시}": formatShootTime(info.newShootStart),
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

/**
 * 이메일 규칙(email_rules)의 {{변수명}} 자리표시자를 채우는 공용
 * 변수맵. 예전엔 목적(접수/확정/…)마다 변수맵 함수가 따로 있었지만,
 * 이제는 어느 트리거의 규칙에든 같은 변수를 자유롭게 쓸 수 있어야
 * 해서 하나로 통합했다 — 호출하는 쪽이 그 시점에 실제로 아는 값만
 * 채워 넘기고, 나머지는 자동으로 빈 문자열이 된다(카카오 변수
 * #{...}와 이름 형식이 겹치지 않게 접두사 없이 그대로 쓴다).
 */
export function buildEmailVariables(info: {
  customerName?: string;
  customerPhone?: string;
  productName?: string;
  /** 확정 전(후보만 낸 상태)이거나 아직 없으면 null/undefined. */
  shootStart?: Date | null;
  /** 관리자가 예약 상세에서 입력한 촬영 장소. */
  shootLocation?: string | null;
  code?: string;
  bankAccount?: string | null;
  notice?: string | null;
  candidateTimes?: Date[];
  oldShootStart?: Date;
  newShootStart?: Date;
}): Record<string, string> {
  return {
    이름: info.customerName ?? "",
    연락처: info.customerPhone ?? "",
    상품명: info.productName ?? "",
    일시: info.shootStart ? formatShootTime(info.shootStart) : "",
    촬영장소: info.shootLocation ?? "",
    예약번호: info.code ?? "",
    계좌: info.bankAccount ?? "",
    공지: info.notice ?? "",
    후보목록:
      info.candidateTimes && info.candidateTimes.length > 0
        ? formatCandidateListMultiline(info.candidateTimes)
        : "",
    기존일시: info.oldShootStart ? formatShootTime(info.oldShootStart) : "",
    변경일시: info.newShootStart ? formatShootTime(info.newShootStart) : "",
  };
}
