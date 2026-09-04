import "server-only";
import { createAdminClient } from "../supabase/admin";
import {
  addDays,
  diffDays,
  kstToday,
  kstToInstant,
  weekdayOf,
  type DateString,
} from "../time";
import { parseTstzRange, toTstzRange, type Interval } from "./range";
import {
  computeAvailableSlots,
  type AvailabilitySettings,
  type DateOverride,
  type Slot,
  type WeeklyHour,
} from "./slots";

/**
 * DB에서 예약 가능 시간을 계산하는 두 진입점.
 *
 * service role 키로 조회한다. 운영시간·휴무·차단 테이블은 관리자 전용 RLS라
 * 손님 키로는 읽을 수 없고, 차단 사유("시험", "개인 일정")처럼 사적인 내용도
 * 들어 있다. 그래서 서버가 대신 읽어 **계산 결과만** 손님에게 내려준다.
 *
 * 이 파일은 반드시 서버에서만 불러야 한다 ("server-only" 임포트가 강제한다).
 */

/** 특정 날짜의 시간 슬롯. 시간 선택 화면에서 쓴다. */
export async function loadAvailableSlots(params: {
  date: DateString;
  productId: string;
  now?: Date;
  /**
   * 이미 불러온 settings 행이 있으면 넘긴다. 호출하는 페이지가 계좌번호·
   * 공지 같은 다른 목적으로 settings를 이미 읽은 경우, 같은 한 행을
   * 두 번 조회하지 않으려고 둔 값이다.
   */
  settings?: AvailabilitySettings;
}): Promise<Slot[]> {
  const now = params.now ?? new Date();
  const context = await loadScheduleContext({
    productId: params.productId,
    from: params.date,
    to: params.date,
    settings: params.settings,
  });
  if (!context) return [];

  return computeAvailableSlots({
    date: params.date,
    now,
    today: kstToday(now),
    product: context.product,
    settings: context.settings,
    weeklyHours: context.weeklyHours.filter(
      (hours) => hours.weekday === weekdayOf(params.date),
    ),
    dateOverride: context.dateOverrides.get(params.date) ?? null,
    blocks: context.blocks,
    reservations: context.reservations,
  });
}

/**
 * 기간 안에서 예약 가능한 슬롯이 하나라도 있는 날짜의 집합. 달력에서
 * "이 날짜는 눌러도 된다"를 표시하려고 쓴다.
 *
 * 날짜마다 DB를 다시 조회하지 않는다. 기간 전체의 예외·차단·예약을
 * 한 번에 불러온 뒤, 순수 함수인 computeAvailableSlots를 메모리에서
 * 날짜 수만큼 돌린다.
 */
export async function loadAvailableDates(params: {
  productId: string;
  from: DateString;
  to: DateString;
  now?: Date;
  /** loadAvailableSlots의 같은 이름 옵션 참고. */
  settings?: AvailabilitySettings;
}): Promise<Set<DateString>> {
  const now = params.now ?? new Date();
  const context = await loadScheduleContext(params);
  if (!context) return new Set();

  const today = kstToday(now);
  const available = new Set<DateString>();
  const dayCount = diffDays(params.from, params.to);

  for (let i = 0; i <= dayCount; i++) {
    const date = addDays(params.from, i);
    const slots = computeAvailableSlots({
      date,
      now,
      today,
      product: context.product,
      settings: context.settings,
      weeklyHours: context.weeklyHours.filter(
        (hours) => hours.weekday === weekdayOf(date),
      ),
      dateOverride: context.dateOverrides.get(date) ?? null,
      blocks: context.blocks,
      reservations: context.reservations,
    });
    if (slots.length > 0) available.add(date);
  }

  return available;
}

type ScheduleContext = {
  product: { durationMin: number; bufferAfterMin: number };
  settings: AvailabilitySettings;
  weeklyHours: WeeklyHour[];
  dateOverrides: Map<DateString, DateOverride>;
  blocks: Interval[];
  reservations: Interval[];
};

async function loadScheduleContext(params: {
  productId: string;
  from: DateString;
  to: DateString;
  settings?: AvailabilitySettings;
}): Promise<ScheduleContext | null> {
  const supabase = createAdminClient();

  // 기간 전체(KST 기준)를 덮는 구간. 차단·예약 조회 범위로 쓴다.
  const rangeStart = kstToInstant(params.from, "00:00");
  const rangeEnd = kstToInstant(params.to, "24:00");
  const range = toTstzRange({ start: rangeStart, end: rangeEnd });

  // settings를 이미 넘겨받았으면 다시 조회하지 않는다 — 같은 한 행을
  // 페이지 로드마다 두 번 읽는 낭비를 피한다 (settings는 항상 한 행뿐이다).
  const [product, settings, weeklyHours, dateOverrides, blocks, reservations] =
    await Promise.all([
      supabase
        .from("products")
        .select("duration_min, buffer_after_min, is_published")
        .eq("id", params.productId)
        .single(),
      params.settings
        ? Promise.resolve({ data: null, error: null })
        : supabase
            .from("settings")
            .select("slot_interval_min, min_lead_days, max_advance_days")
            .eq("id", 1)
            .single(),
      supabase.from("weekly_hours").select("weekday, open_time, close_time"),
      supabase
        .from("date_overrides")
        .select("date, is_closed, open_time, close_time")
        .gte("date", params.from)
        .lte("date", params.to),
      supabase.from("blocks").select("period").overlaps("period", range),
      supabase
        .from("reservations")
        .select("period")
        .in("status", ["requested", "confirmed"])
        .overlaps("period", range),
    ]);

  // 조회가 하나라도 실패하면 "빈 시간이 많다"는 잘못된 답을 주게 된다.
  // 그건 이중예약으로 이어지므로 조용히 넘어가지 않고 실패시킨다.
  const productRow = unwrap(product, "상품");
  const settingsRow =
    params.settings ?? toAvailabilitySettings(unwrap(settings, "설정"));
  const weeklyHourRows = unwrap(weeklyHours, "운영시간");
  const overrideRows = unwrap(dateOverrides, "날짜 예외");
  const blockRows = unwrap(blocks, "차단 시간");
  const reservationRows = unwrap(reservations, "기존 예약");

  if (!productRow || !productRow.is_published) return null;
  if (!settingsRow) {
    throw new Error("settings 행(id=1)이 없습니다. 마이그레이션을 확인하세요.");
  }

  return {
    product: {
      durationMin: productRow.duration_min,
      bufferAfterMin: productRow.buffer_after_min,
    },
    settings: settingsRow,
    weeklyHours: (weeklyHourRows ?? []).map((row) => ({
      weekday: row.weekday,
      openTime: row.open_time,
      closeTime: row.close_time,
    })),
    dateOverrides: new Map(
      (overrideRows ?? []).map((row) => [
        row.date,
        {
          isClosed: row.is_closed,
          openTime: row.open_time,
          closeTime: row.close_time,
        },
      ]),
    ),
    blocks: toIntervals(blockRows),
    reservations: toIntervals(reservationRows),
  };
}

/**
 * 조회 결과에서 데이터를 꺼낸다. 실패했으면 어느 조회였는지 알려주며 던진다.
 * 실패를 삼키면 "그 시간 비었다"는 답이 나가고, 그대로 이중예약이 된다.
 */
function unwrap<T>(
  result: { data: T; error: null } | { data: null; error: { message: string } },
  what: string,
): T | null {
  if (result.error) {
    throw new Error(`${what} 조회 실패: ${result.error.message}`);
  }
  return result.data;
}

function toIntervals(rows: { period: string }[] | null): Interval[] {
  return (rows ?? []).map((row) => parseTstzRange(row.period));
}

function toAvailabilitySettings(
  row: {
    slot_interval_min: number;
    min_lead_days: number;
    max_advance_days: number;
  } | null,
): AvailabilitySettings | null {
  if (!row) return null;
  return {
    slotIntervalMin: row.slot_interval_min,
    minLeadDays: row.min_lead_days,
    maxAdvanceDays: row.max_advance_days,
  };
}
