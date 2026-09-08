import { kstToday, type DateString } from "./time";

export type AgeInfo = {
  /** 만 나이. 2023년부터 통일된 법적 나이 기준(민법상 성년 기준도 이거다). */
  manAge: number;
  /** 세는 나이(한국식 나이). 태어난 해를 1살로 친다. */
  koreanAge: number;
  /** 만 19세 미만이면 민법상 미성년자. */
  isMinor: boolean;
};

/**
 * "19990101" 같은 생년월일 8자리를 "1999-01-01"로 바꾼다.
 * 2월 30일처럼 실제로 없는 날짜면 null을 돌려준다 — `Date`는 그런 값을
 * 조용히 다음 달로 넘겨버리므로, 다시 읽어서 입력과 같은지 확인해야 한다.
 */
export function parseBirthDate8(input: string): DateString | null {
  if (!/^\d{8}$/.test(input)) return null;

  const year = Number(input.slice(0, 4));
  const month = Number(input.slice(4, 6));
  const day = Number(input.slice(6, 8));
  if (month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 생년월일로 만나이·세는나이·미성년자 여부를 계산한다. 기준일 기본값은 오늘(KST). */
export function calculateAge(
  birthDate: DateString,
  today: DateString = kstToday(),
): AgeInfo {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);

  let manAge = ty - by;
  if (tm < bm || (tm === bm && td < bd)) manAge -= 1;

  const koreanAge = ty - by + 1;

  return { manAge, koreanAge, isMinor: manAge < 19 };
}
