import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, kstDateString, kstToday, type DateString } from "@/lib/time";

export type ProductAnalyticsRow = {
  productId: string;
  productName: string;
  views: number;
  applications: number;
  /** 조회가 한 번도 없으면 계산할 분모가 없어 null. */
  conversionRate: number | null;
};

export type DailyAnalyticsPoint = {
  date: DateString;
  views: number;
  applications: number;
};

export type ProductAnalytics = {
  rows: ProductAnalyticsRow[];
  /** 최근 trendDays일, 전 상품 합계(사이트 전체 동향용). 날짜 오름차순. */
  daily: DailyAnalyticsPoint[];
};

/**
 * 상품별 조회수·신청수·전환율과, 최근 며칠간의 사이트 전체 동향을
 * 계산한다. product_views/reservations 둘 다 행 수가 아직은 (스튜디오
 * 하나 규모라) 많지 않아, DB에서 GROUP BY로 집계하는 대신 필요한
 * 컬럼만 뽑아 와서 여기서 직접 센다 — 나중에 행이 아주 많아지면 그때
 * DB 집계 함수로 옮기면 된다.
 */
export async function loadProductAnalytics(
  trendDays = 14,
): Promise<ProductAnalytics> {
  const supabase = await createClient();
  const since = addDays(kstToday(), -(trendDays - 1));
  const sinceInstant = `${since}T00:00:00+09:00`;

  const [{ data: products }, { data: viewRows }, { data: reservationRows }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("product_views")
        .select("product_id, viewed_at")
        .gte("viewed_at", sinceInstant),
      supabase
        .from("reservations")
        .select("product_id, created_at")
        .gte("created_at", sinceInstant),
    ]);

  // 상품별 전체 조회수·신청수는 위 최근 N일 범위와 별개로(all-time)
  // 한 번 더 센다 — 표에는 "지금까지 누적" 기준을 보여주고, 동향
  // 그래프만 최근 N일로 좁힌다.
  const [{ data: allViewRows }, { data: allReservationRows }] =
    await Promise.all([
      supabase.from("product_views").select("product_id"),
      supabase.from("reservations").select("product_id"),
    ]);

  const viewCountByProduct = new Map<string, number>();
  for (const row of allViewRows ?? []) {
    viewCountByProduct.set(
      row.product_id,
      (viewCountByProduct.get(row.product_id) ?? 0) + 1,
    );
  }

  const applicationCountByProduct = new Map<string, number>();
  for (const row of allReservationRows ?? []) {
    applicationCountByProduct.set(
      row.product_id,
      (applicationCountByProduct.get(row.product_id) ?? 0) + 1,
    );
  }

  const rows: ProductAnalyticsRow[] = (products ?? []).map((p) => {
    const views = viewCountByProduct.get(p.id) ?? 0;
    const applications = applicationCountByProduct.get(p.id) ?? 0;
    return {
      productId: p.id,
      productName: p.name,
      views,
      applications,
      conversionRate: views > 0 ? (applications / views) * 100 : null,
    };
  });

  const dailyMap = new Map<DateString, { views: number; applications: number }>();
  for (let i = 0; i < trendDays; i++) {
    dailyMap.set(addDays(since, i), { views: 0, applications: 0 });
  }
  for (const row of viewRows ?? []) {
    const date = kstDateString(new Date(row.viewed_at));
    const bucket = dailyMap.get(date);
    if (bucket) bucket.views += 1;
  }
  for (const row of reservationRows ?? []) {
    const date = kstDateString(new Date(row.created_at));
    const bucket = dailyMap.get(date);
    if (bucket) bucket.applications += 1;
  }

  const daily: DailyAnalyticsPoint[] = Array.from(
    dailyMap.entries(),
    ([date, counts]) => ({ date, ...counts }),
  );

  return { rows, daily };
}
