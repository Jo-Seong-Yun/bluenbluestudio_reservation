import "server-only";
import { createClient } from "@/lib/supabase/server";
import { googleCalendarColorId } from "@/lib/product-tag-colors";
import { googleCalendarConfigured } from "./env";
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

const CONFIRMED_STATUSES = new Set(["confirmed", "completed", "no_show"]);

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
    const supabase = await createClient();
    const { data: reservation } = await supabase
      .from("reservations")
      .select(
        "code, status, shoot_start, shoot_end, customer_name, customer_phone, people_count, memo, admin_memo, google_calendar_event_id, product_id",
      )
      .eq("id", reservationId)
      .maybeSingle();
    if (!reservation) return;

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
      }
      return;
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
        return;
      } catch {
        // 캘린더에서 이벤트가 이미 지워진 경우(관리자가 구글 캘린더
        // 앱에서 직접 지운 경우 등) — 새로 만든다.
      }
    }

    const eventId = await createEvent(event);
    await supabase
      .from("reservations")
      .update({ google_calendar_event_id: eventId })
      .eq("id", reservationId);
  } catch (error) {
    console.error("구글 캘린더 동기화 실패:", error);
  }
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
