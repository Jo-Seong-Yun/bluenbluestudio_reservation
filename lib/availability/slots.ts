/**
 * 예약 가능 시간 계산.
 *
 * 이 프로젝트에서 가장 조심해야 할 코드다. 여기가 틀리면
 * 손님이 못 오는 시간에 예약을 잡거나, 멀쩡히 빈 시간이 안 보인다.
 *
 * 외부에 의존하지 않는 순수 함수로 둔다. DB 조회는 load.ts가 맡고,
 * 여기서는 넘겨받은 값만으로 판정한다. 그래야 테스트로 전부 확인할 수 있다.
 *
 * 판정 순서 (docs/ROADMAP.md 3장)
 *   1. 그날 운영시간을 정한다  — date_overrides가 weekly_hours를 덮어쓴다
 *   2. 리드타임/예약가능기간 밖이면 그날은 통째로 닫는다
 *   3. 운영시간 안에서 슬롯 간격만큼 후보를 만든다
 *   4. 후보마다 점유구간을 그려 운영시간·차단·기존예약과 부딪히면 뺀다
 */
import {
  kstTimeString,
  kstToInstant,
  weekdayOf,
  type DateString,
} from "../time";
import { overlaps, type Interval } from "./range";

export type OpeningHours = {
  /** "HH:MM" 또는 "HH:MM:SS" (KST 벽시계) */
  openTime: string;
  closeTime: string;
};

export type WeeklyHour = OpeningHours & {
  /** 0=일요일 … 6=토요일 */
  weekday: number;
};

export type DateOverride = {
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type AvailabilitySettings = {
  slotIntervalMin: number;
  /** 최소 며칠 전에 예약해야 하는가. 1이면 "내일부터" (당일 예약 불가) */
  minLeadDays: number;
  /** 오늘부터 며칠 뒤까지 열어둘 것인가 */
  maxAdvanceDays: number;
};

export type BookableProduct = {
  durationMin: number;
  /** 촬영이 끝난 뒤 정리에 필요한 시간. 다음 슬롯을 밀어낸다 */
  bufferAfterMin: number;
};

export type AvailabilityInput = {
  /** 조회 대상 날짜 (KST 달력 기준) */
  date: DateString;
  /** 판정 기준 시각. 테스트에서 "지금"을 고정하려고 받는다 */
  now: Date;
  /** 오늘 날짜 (KST). load.ts가 kstToday(now)로 넘긴다 */
  today: DateString;
  product: BookableProduct;
  settings: AvailabilitySettings;
  /** 그 요일의 운영시간. 한 요일에 여러 구간(오전/오후)일 수 있다 */
  weeklyHours: WeeklyHour[];
  /** 그 날짜의 예외. 없으면 null */
  dateOverride?: DateOverride | null;
  /** 사장님이 막아둔 개인 일정 */
  blocks: Interval[];
  /** 진행 중인 예약(requested/confirmed)의 점유구간. 취소·노쇼는 넘기지 않는다 */
  reservations: Interval[];
};

export type Slot = {
  /** 촬영 시작 시점 */
  start: Date;
  /** 촬영 종료 시점 (버퍼 제외 — 손님에게 보여줄 시간) */
  end: Date;
  /** 손님에게 보여줄 시작 시각. "18:00" */
  time: string;
};

const MINUTE = 60_000;

export function computeAvailableSlots(input: AvailabilityInput): Slot[] {
  const { date, now, today, product, settings, blocks, reservations } = input;

  if (!isWithinBookingWindow(date, today, settings)) return [];

  const openings = resolveOpeningHours(input);
  if (openings.length === 0) return [];

  const occupied = [...blocks, ...reservations];
  const slots: Slot[] = [];

  for (const opening of openings) {
    const openAt = kstToInstant(date, opening.openTime);
    const closeAt = kstToInstant(date, opening.closeTime);

    for (
      let startMs = openAt.getTime();
      startMs < closeAt.getTime();
      startMs += settings.slotIntervalMin * MINUTE
    ) {
      const start = new Date(startMs);
      const end = new Date(startMs + product.durationMin * MINUTE);
      // 점유구간은 정리 시간까지 포함한다. 예약이 실제로 자리를 잡는 범위이자
      // DB의 reservations.period와 같은 값이다.
      const occupies: Interval = {
        start,
        end: new Date(end.getTime() + product.bufferAfterMin * MINUTE),
      };

      // 이미 지난 시각은 오늘 날짜에서만 문제가 되지만, 리드타임 규칙이
      // 오늘을 통째로 막고 있어도 방어적으로 한 번 더 본다.
      if (start <= now) continue;

      // 정리 시간까지 운영시간 안에 들어와야 한다.
      if (occupies.end > closeAt) continue;

      if (occupied.some((taken) => overlaps(occupies, taken))) continue;

      slots.push({ start, end, time: kstTimeString(start) });
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * 예약을 받는 날짜 범위인가.
 *
 * 리드타임은 "날짜" 기준이다. minLeadDays가 1이면 오늘이 9월 3일일 때
 * 9월 4일부터 열린다. 9월 4일은 몇 시에 접속하든 통째로 열린다.
 * ("24시간 뒤부터"로 하면 저녁에 본 사람과 아침에 본 사람이 서로 다른
 * 시간표를 보게 되어 헷갈린다. docs/ROADMAP.md 3장)
 */
function isWithinBookingWindow(
  date: DateString,
  today: DateString,
  settings: AvailabilitySettings,
): boolean {
  const daysAhead = daysBetween(today, date);
  return (
    daysAhead >= settings.minLeadDays && daysAhead <= settings.maxAdvanceDays
  );
}

function daysBetween(from: DateString, to: DateString): number {
  const toUtc = (value: DateString) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/**
 * 그날의 운영시간. 3층 구조에서 위 두 층을 해석한다.
 *
 *   date_overrides 에 그날이 있으면  → 그 값이 이긴다 (휴무면 빈 배열)
 *   없으면                          → weekly_hours 의 그 요일 값
 *   그것도 없으면                    → 휴무
 *
 * 3층인 blocks는 여기서 다루지 않는다. 운영시간을 바꾸는 게 아니라
 * 개별 슬롯을 쳐내는 것이라 computeAvailableSlots에서 처리한다.
 */
function resolveOpeningHours(input: AvailabilityInput): OpeningHours[] {
  const { dateOverride, weeklyHours, date } = input;

  if (dateOverride) {
    if (dateOverride.isClosed) return [];
    if (dateOverride.openTime && dateOverride.closeTime) {
      return [
        { openTime: dateOverride.openTime, closeTime: dateOverride.closeTime },
      ];
    }
    // is_closed=false 인데 시간이 비어 있는 행은 DB 제약이 막는다.
    // 그래도 들어왔다면 신뢰할 수 없으니 그날은 닫는다.
    return [];
  }

  const weekday = weekdayOf(date);
  return weeklyHours
    .filter((hours) => hours.weekday === weekday)
    .map(({ openTime, closeTime }) => ({ openTime, closeTime }));
}
