/**
 * 시간 처리 규칙
 *
 * 예약 서비스에서 시간대 실수는 곧 잘못된 예약이다. 규칙을 하나로 고정한다.
 *
 *   1. 저장은 항상 UTC (`timestamptz`, JS에서는 `Date`)
 *   2. 계산과 표시는 항상 한국 시간(KST)
 *   3. 문자열을 `new Date("2026-09-03 14:00")`처럼 파싱하지 않는다.
 *      실행 환경의 시간대에 따라 결과가 달라진다. (Vercel 서버는 UTC다)
 *
 * 한국은 서머타임이 없어 KST는 연중 UTC+9로 고정이다.
 * 그래도 오프셋을 직접 더하지 않고 `Intl`에 맡긴다.
 */

export const TIME_ZONE = "Asia/Seoul";

/** "2026-09-03" 형태의 날짜 문자열. KST 기준 달력 날짜다. */
export type DateString = string;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type KstParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
};

/** UTC 시점을 KST 달력 값으로 쪼갠다. */
export function kstParts(instant: Date): KstParts {
  const found: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") found[part.type] = part.value;
  }
  return {
    year: Number(found.year),
    month: Number(found.month),
    day: Number(found.day),
    hour: Number(found.hour),
    minute: Number(found.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC 시점이 KST로 몇 월 며칠인지. "2026-09-03" */
export function kstDateString(instant: Date): DateString {
  const { year, month, day } = kstParts(instant);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** UTC 시점이 KST로 몇 시인지. "14:00" */
export function kstTimeString(instant: Date): string {
  const { hour, minute } = kstParts(instant);
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * 날짜 문자열에 일수를 더한다. 월말과 연말을 넘어가도 안전하다.
 * 달력 날짜끼리의 계산이므로 시간대가 개입하지 않도록 UTC로 계산한다.
 */
export function addDays(date: DateString, days: number): DateString {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

/** 두 날짜 문자열의 차이(일). b가 나중이면 양수. */
export function diffDays(a: DateString, b: DateString): number {
  const toUtc = (d: DateString) => {
    const [year, month, day] = d.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 지금 이 순간 기준으로 KST 오늘 날짜. */
export function kstToday(now: Date = new Date()): DateString {
  return kstDateString(now);
}
