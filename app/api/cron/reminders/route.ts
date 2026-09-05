import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, kstToday, kstToInstant } from "@/lib/time";
import { notifyCustomerReminder } from "@/lib/notifications/notify";
import { getProductName } from "@/lib/notifications/product-name";

export const dynamic = "force-dynamic";

/**
 * 촬영 전날 리마인드 (Phase 8). Vercel Cron이 매일 한 번 호출한다
 * (vercel.json의 crons 항목). 확정(confirmed)된 예약 중 "내일" 촬영인
 * 것만, 아직 안 보낸 것만(`reminded_at is null`) 골라 보낸다 — 크론이
 * 재시도 등으로 하루에 두 번 불려도 중복 발송되지 않게 막는 장치다.
 *
 * Vercel Cron 요청에는 자동으로 `Authorization: Bearer $CRON_SECRET`이
 * 실린다. 이 라우트는 그 값을 확인해, 경로를 알아도 남이 그냥 호출하지
 * 못하게 막는다.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const tomorrow = addDays(kstToday(), 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);
  const rangeStart = kstToInstant(tomorrow, "00:00").toISOString();
  const rangeEnd = kstToInstant(dayAfterTomorrow, "00:00").toISOString();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, code, customer_phone, shoot_start, product_id")
    .eq("status", "confirmed")
    .is("reminded_at", null)
    .gte("shoot_start", rangeStart)
    .lt("shoot_start", rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const reservation of reservations ?? []) {
    const productName = await getProductName(reservation.product_id);
    await notifyCustomerReminder({
      reservationId: reservation.id,
      customerPhone: reservation.customer_phone,
      productName,
      shootStart: new Date(reservation.shoot_start),
      code: reservation.code,
    });
    await supabase
      .from("reservations")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", reservation.id);
    sent += 1;
  }

  return NextResponse.json({ sent });
}
