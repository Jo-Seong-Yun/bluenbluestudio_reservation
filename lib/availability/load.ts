import "server-only";
import { createAdminClient } from "../supabase/admin";
import { kstToday, kstToInstant, weekdayOf, type DateString } from "../time";
import { parseTstzRange, toTstzRange, type Interval } from "./range";
import {
  computeAvailableSlots,
  type AvailabilitySettings,
  type Slot,
} from "./slots";

/**
 * 특정 날짜의 예약 가능 시간을 계산해서 돌려준다.
 *
 * service role 키로 조회한다. 운영시간·휴무·차단 테이블은 관리자 전용 RLS라
 * 손님 키로는 읽을 수 없고, 차단 사유("시험", "개인 일정")처럼 사적인 내용도
 * 들어 있다. 그래서 서버가 대신 읽어 **계산 결과만** 손님에게 내려준다.
 *
 * 이 파일은 반드시 서버에서만 불러야 한다 ("server-only" 임포트가 강제한다).
 */
export async function loadAvailableSlots(params: {
  date: DateString;
  productId: string;
  now?: Date;
}): Promise<Slot[]> {
  const now = params.now ?? new Date();
  const supabase = createAdminClient();

  // 그날 하루 전체(KST 기준)를 덮는 구간. 차단·예약 조회 범위로 쓴다.
  const dayStart = kstToInstant(params.date, "00:00");
  const dayEnd = kstToInstant(params.date, "24:00");
  const dayRange = toTstzRange({ start: dayStart, end: dayEnd });

  const [product, settings, weeklyHours, dateOverride, blocks, reservations] =
    await Promise.all([
      supabase
        .from("products")
        .select("duration_min, buffer_after_min, is_published")
        .eq("id", params.productId)
        .single(),
      supabase
        .from("settings")
        .select("slot_interval_min, min_lead_days, max_advance_days")
        .eq("id", 1)
        .single(),
      supabase
        .from("weekly_hours")
        .select("weekday, open_time, close_time")
        .eq("weekday", weekdayOf(params.date)),
      supabase
        .from("date_overrides")
        .select("is_closed, open_time, close_time")
        .eq("date", params.date)
        .maybeSingle(),
      supabase.from("blocks").select("period").overlaps("period", dayRange),
      supabase
        .from("reservations")
        .select("period")
        .in("status", ["requested", "confirmed"])
        .overlaps("period", dayRange),
    ]);

  // 조회가 하나라도 실패하면 "빈 시간이 많다"는 잘못된 답을 주게 된다.
  // 그건 이중예약으로 이어지므로 조용히 넘어가지 않고 실패시킨다.
  const productRow = unwrap(product, "상품");
  const settingsRow = unwrap(settings, "설정");
  const weeklyHourRows = unwrap(weeklyHours, "운영시간");
  const overrideRow = unwrap(dateOverride, "날짜 예외");
  const blockRows = unwrap(blocks, "차단 시간");
  const reservationRows = unwrap(reservations, "기존 예약");

  if (!productRow || !productRow.is_published) return [];
  if (!settingsRow) {
    throw new Error("settings 행(id=1)이 없습니다. 마이그레이션을 확인하세요.");
  }

  const availabilitySettings: AvailabilitySettings = {
    slotIntervalMin: settingsRow.slot_interval_min,
    minLeadDays: settingsRow.min_lead_days,
    maxAdvanceDays: settingsRow.max_advance_days,
  };

  return computeAvailableSlots({
    date: params.date,
    now,
    today: kstToday(now),
    product: {
      durationMin: productRow.duration_min,
      bufferAfterMin: productRow.buffer_after_min,
    },
    settings: availabilitySettings,
    weeklyHours: (weeklyHourRows ?? []).map((row) => ({
      weekday: row.weekday,
      openTime: row.open_time,
      closeTime: row.close_time,
    })),
    dateOverride: overrideRow
      ? {
          isClosed: overrideRow.is_closed,
          openTime: overrideRow.open_time,
          closeTime: overrideRow.close_time,
        }
      : null,
    blocks: toIntervals(blockRows),
    reservations: toIntervals(reservationRows),
  });
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
