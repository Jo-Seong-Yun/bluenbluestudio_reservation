import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReservationStatus } from "@/lib/supabase/database.types";
import { googleCalendarColorId } from "@/lib/product-tag-colors";
import { googleCalendarConfigured, googleCalendarId } from "./env";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type CalendarEventInput,
} from "./calendar-api";

/**
 * 예약을 구글 캘린더 이벤트로 동기화(단방향: DB → 캘린더)한다.
 *
 * 구글 시트 백업(lib/google-sheets/sync.ts)과 같은 자리에서, 같은
 * 정신으로 쓴다 — 예약이 생성/변경되는 모든 지점에서 after(() =>
 * syncReservationToCalendar(id))로 부르고, 절대 throw하지 않는다.
 *
 * 시트와 달리 취소·미확정 예약은 캘린더에서 지운다(행을 남겨두는
 * 시트와 다르게, 캘린더는 "지금 실제로 잡혀 있는 일정"만 보여주는
 * 화면이라 취소된 일정이 남아있으면 헷갈린다).
 */

const CONFIRMED_STATUSES = new Set<ReservationStatus>([
  "schedule_confirmed",
  "payment_confirmed",
  "completed",
  "no_show",
]);

function buildEvent(
  reservation: {
    code: string;
    customer_name: string;
    customer_phone: string;
    people_count: number | null;
    memo: string | null;
    admin_memo: string | null;
    shoot_start: string;
    shoot_end: string;
  },
  productName: string,
  productTagColor: string | null,
): CalendarEventInput {
  const lines = [
    `연락처: ${reservation.customer_phone}`,
    reservation.people_count ? `인원: ${reservation.people_count}명` : null,
    `예약번호: ${reservation.code}`,
    reservation.memo ? `손님 요청사항: ${reservation.memo}` : null,
    reservation.admin_memo ? `사장님 메모: ${reservation.admin_memo}` : null,
  ].filter((line): line is string => Boolean(line));

  return {
    summary: `${productName} · ${reservation.customer_name}`,
    description: lines.join("\n"),
    start: reservation.shoot_start,
    end: reservation.shoot_end,
    // 관리자 화면에서 상품마다 고른 태그 색을 구글 캘린더 색으로도
    // 그대로 맞춘다(lib/product-tag-colors.ts) — 팔레트 자체를 구글
    // 캘린더의 11색과 똑같이 잡아뒀기 때문에 근사가 아니라 정확히 같은
    // 색으로 매핑된다.
    colorId: googleCalendarColorId(productTagColor),
  };
}

/**
 * syncOneReservationToCalendar가 실제로 한 일. "던지지 않고 끝났다"만
 * 성공으로 치면 내부에서 조용히 건너뛴 경우까지 성공으로 잘못 세게
 * 되므로("반영했다"는데 캘린더엔 없는 상황), 무슨 일이 있었는지를
 * 호출하는 쪽이 정확히 구분할 수 있게 결과를 돌려준다.
 */
type SyncOutcome =
  | { kind: "created_or_updated"; eventId: string }
  | { kind: "removed" }
  | { kind: "skipped"; reason: string };

/**
 * syncReservationToCalendar의 실제 동작. 자동 동기화 지점에서 쓰는
 * 공개 함수는 이걸 try/catch로 감싸 절대 던지지 않게 하고, 아래
 * backfillAllToCalendar는 이 버전을 직접 불러 건별 결과를 정확히 센다.
 */
async function syncOneReservationToCalendar(
  reservationId: string,
): Promise<SyncOutcome> {
  const supabase = await createClient();
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select(
      "code, status, shoot_start, shoot_end, customer_name, customer_phone, people_count, memo, admin_memo, google_calendar_event_id, product_id",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (fetchError) {
    throw new Error(`예약을 불러오지 못했습니다: ${fetchError.message}`);
  }
  if (!reservation) {
    return { kind: "skipped", reason: "예약을 찾을 수 없음" };
  }

  if (
    !CONFIRMED_STATUSES.has(reservation.status) ||
    !reservation.shoot_start ||
    !reservation.shoot_end
  ) {
    if (reservation.google_calendar_event_id) {
      await deleteEvent(reservation.google_calendar_event_id).catch(() => {});
      await supabase
        .from("reservations")
        .update({ google_calendar_event_id: null })
        .eq("id", reservationId);
      return { kind: "removed" };
    }
    return {
      kind: "skipped",
      reason: `대상 상태 아님(status=${reservation.status}, shoot_start=${reservation.shoot_start ?? "null"})`,
    };
  }

  const { data: product } = await supabase
    .from("products")
    .select("name, tag_color")
    .eq("id", reservation.product_id)
    .maybeSingle();

  const event = buildEvent(
    { ...reservation, shoot_start: reservation.shoot_start, shoot_end: reservation.shoot_end },
    product?.name ?? "촬영",
    product?.tag_color ?? null,
  );

  if (reservation.google_calendar_event_id) {
    try {
      await updateEvent(reservation.google_calendar_event_id, event);
      return {
        kind: "created_or_updated",
        eventId: reservation.google_calendar_event_id,
      };
    } catch {
      // 캘린더에서 이벤트가 이미 지워진 경우(관리자가 구글 캘린더
      // 앱에서 직접 지운 경우 등) — 새로 만든다.
    }
  }

  const eventId = await createEvent(event);
  const { error: updateError } = await supabase
    .from("reservations")
    .update({ google_calendar_event_id: eventId })
    .eq("id", reservationId);
  if (updateError) {
    // 캘린더엔 이미 만들어졌는데 DB에 id를 못 남기면, 다음 동기화 때
    // 이 이벤트를 다시 못 찾아 중복으로 하나 더 만들게 된다 — 조용히
    // 넘기지 않고 알린다.
    console.error(
      `구글 캘린더 이벤트(${eventId})는 만들었지만 예약(${reservationId})에 id 저장 실패:`,
      updateError.message,
    );
  }
  console.log(
    `구글 캘린더 이벤트 생성: reservation=${reservationId} eventId=${eventId} calendarId=${googleCalendarId()}`,
  );

  return { kind: "created_or_updated", eventId };
}

/**
 * 예약 하나를 최신 상태로 캘린더에 반영한다. 확정(confirmed)·완료
 * (completed)·노쇼(no_show) 중 하나면서 shoot_start·shoot_end가 있는
 * 예약만 이벤트로 남는다 — 취소됐거나 아직 후보만 낸 예약은 시간
 * 자체가 없거나 의미가 없어 이벤트가 있으면 지운다.
 */
export async function syncReservationToCalendar(
  reservationId: string,
): Promise<void> {
  if (!googleCalendarConfigured()) return;

  try {
    await syncOneReservationToCalendar(reservationId);
  } catch (error) {
    console.error("구글 캘린더 동기화 실패:", error);
  }
}

/**
 * 이 연동을 붙이기 전부터 있던 예약들을 한 번에 소급 반영한다. 시트
 * 백업(탭 전체를 한 번에 덮어쓰는 방식)과 달리 캘린더는 이벤트를
 * 한 건씩 만들어야 해서, 확정·완료·노쇼 상태이면서 촬영 일시가 있는
 * 예약을 모두 찾아 한 건씩 syncOneReservationToCalendar를 부른다(이미
 * 이벤트가 있으면 갱신, 없으면 새로 만든다 — 멱등이라 몇 번을 다시
 * 눌러도 안전하다). 설정 화면에서 관리자가 명시적으로 누르는 일회성
 * 작업이라 전체 조회 실패는 그대로 throw하지만, 건별 실패까지 전체를
 * 멈추면 앞서 성공한 수백 건을 다시 반복해야 하니 건별로는 계속
 * 진행한다.
 *
 * syncedCount는 실제로 이벤트를 만들거나 갱신한 건수만 센다 — 예외 없이
 * 끝났다고 전부 성공으로 세면, 내부에서 조용히 건너뛴 경우까지 성공으로
 * 잘못 보고하게 된다(반영됐다고 뜨는데 캘린더엔 안 보이는 문제의
 * 원인이었다). skippedCount와 각 건의 사유는 Vercel 함수 로그에
 * console.error로 남긴다.
 */
export async function backfillAllToCalendar(): Promise<{
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
}> {
  if (!googleCalendarConfigured()) {
    throw new Error("구글 캘린더 연동 환경변수가 설정되지 않았습니다.");
  }

  const supabase = await createClient();
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id")
    .in("status", Array.from(CONFIRMED_STATUSES))
    .not("shoot_start", "is", null)
    .not("shoot_end", "is", null);
  if (error) throw new Error(`예약 목록을 불러오지 못했습니다: ${error.message}`);
  if (!reservations || reservations.length === 0) {
    return { syncedCount: 0, skippedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  for (const { id } of reservations) {
    try {
      const outcome = await syncOneReservationToCalendar(id);
      if (outcome.kind === "created_or_updated") {
        syncedCount++;
      } else {
        skippedCount++;
        if (outcome.kind === "skipped") {
          console.error(`구글 캘린더 소급 반영 건너뜀: reservation=${id} 사유=${outcome.reason}`);
        }
      }
    } catch (err) {
      failedCount++;
      console.error("구글 캘린더 소급 반영 실패:", id, err);
    }
  }

  return { syncedCount, skippedCount, failedCount };
}

/**
 * 예약이 DB에서 완전히 삭제된 뒤 부른다 — 삭제 직전에 미리 읽어둔
 * 이벤트 id로 캘린더에서도 지운다. 한 번도 동기화된 적 없는
 * 예약(eventId 없음)이면 조용히 넘어간다.
 */
export async function deleteReservationFromCalendar(
  eventId: string | null,
): Promise<void> {
  if (!googleCalendarConfigured() || !eventId) return;

  try {
    await deleteEvent(eventId);
  } catch (error) {
    console.error("구글 캘린더 이벤트 삭제 실패:", error);
  }
}
