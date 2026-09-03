/**
 * Postgres `tstzrange` 다루기.
 *
 * `blocks.period`, `reservations.period`는 범위 타입이라 supabase-js가
 * 문자열로 돌려준다. 예:
 *
 *   ["2026-09-10 09:00:00+00","2026-09-10 10:00:00+00")
 *
 * 우리 스키마는 항상 `[시작, 끝)` (앞은 포함, 뒤는 제외)로 넣는다.
 * 이 반열림 규칙 덕분에 10~11시 예약과 11~12시 예약이 겹치지 않는다.
 * DB의 EXCLUDE 제약도 같은 규칙으로 판정하므로, 여기 계산과 DB 판정이 어긋나지 않는다.
 */

export type Interval = {
  start: Date;
  end: Date;
};

/** 두 구간이 겹치는가. 경계가 맞닿기만 한 경우는 겹치지 않는다. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** JS 구간을 Postgres에 넘길 `[시작,끝)` 문자열로. */
export function toTstzRange({ start, end }: Interval): string {
  return `[${start.toISOString()},${end.toISOString()})`;
}

const RANGE_PATTERN = /^([[(])"?([^",]+?)"?,"?([^",]+?)"?([\])])$/;

/**
 * Postgres가 돌려준 범위 문자열을 구간으로. 형식이 어긋나면 예외를 던진다.
 *
 * 빈 범위(`empty`)나 무한 경계는 우리 스키마에서 만들지 않으므로 지원하지 않는다.
 * 조용히 넘기면 "차단된 시간"이 사라져 이중예약으로 이어지므로 즉시 실패시킨다.
 */
export function parseTstzRange(value: string): Interval {
  const match = RANGE_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`범위 문자열을 해석할 수 없습니다: ${value}`);
  }

  const [, lowerBound, rawStart, rawEnd, upperBound] = match;
  const start = parseTimestamp(rawStart);
  const end = parseTimestamp(rawEnd);

  if (lowerBound !== "[" || upperBound !== ")") {
    throw new Error(
      `[시작,끝) 형태만 지원합니다. 받은 값: ${value} — ` +
        `예약과 차단은 항상 이 형태로 저장해야 DB 제약과 계산이 일치한다.`,
    );
  }
  return { start, end };
}

/**
 * "2026-09-10 09:00:00+00" 형태를 Date로.
 * 공백 구분자를 T로 바꾸고, 시간대 표기가 없으면 UTC로 본다
 * (컬럼이 timestamptz이므로 Postgres는 항상 오프셋을 붙여 보낸다).
 */
function parseTimestamp(raw: string): Date {
  let text = raw.trim().replace(" ", "T");
  if (!/[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(text)) {
    text += "Z";
  }
  // "+00" 처럼 분이 빠진 오프셋은 Date가 못 읽는 환경이 있어 보정한다.
  text = text.replace(/([+-]\d{2})$/, "$1:00");

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`시각을 해석할 수 없습니다: ${raw}`);
  }
  return parsed;
}
