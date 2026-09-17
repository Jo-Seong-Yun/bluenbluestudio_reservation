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

export type ActivityLogEntry = {
  id: string;
  /** ISO 문자열. */
  occurredAt: string;
  kind: "list_view" | "product_view" | "reservation" | "reset";
  /** 목록 진입·리셋은 특정 상품이 없어 null. */
  productName: string | null;
};

export type ProductAnalytics = {
  rows: ProductAnalyticsRow[];
  /** 최근 trendDays일, 전 상품 합계(사이트 전체 동향용). 날짜 오름차순. */
  daily: DailyAnalyticsPoint[];
  /** 상품 목록(예약하기 첫 화면) 진입 수 — 마지막 리셋 이후(없으면 전체) 누적. */
  listViews: number;
  /** 최근 발생 순(내림차순)으로 최근 ACTIVITY_LOG_LIMIT건. 리셋과 무관하게
   * 항상 전체 기록을 보여준다(리셋 시점 자체도 한 줄로 섞여 나온다). */
  recentActivity: ActivityLogEntry[];
};

/** 상세 로그에 보여줄 최근 이벤트 개수. */
const ACTIVITY_LOG_LIMIT = 100;

/**
 * 상품별 조회수·신청수·전환율과, 최근 며칠간의 사이트 전체 동향을
 * 계산한다. product_views/reservations 둘 다 행 수가 아직은 (스튜디오
 * 하나 규모라) 많지 않아, DB에서 GROUP BY로 집계하는 대신 필요한
 * 컬럼만 뽑아 와서 여기서 직접 센다 — 나중에 행이 아주 많아지면 그때
 * DB 집계 함수로 옮기면 된다.
 *
 * "통계 리셋"은 행을 지우지 않고 settings.analytics_reset_at에 시점만
 * 남긴다(상세 로그를 보존하려고 — resetAnalytics 참고) — 그래서 집계용
 * 쿼리들은 그 시점 이후 것만 세도록 조건을 하나 더 건다. 상세 로그
 * (recentActivity)만은 이 조건을 안 걸어 리셋 이전 기록도 계속 보인다.
 */
export async function loadProductAnalytics(
  trendDays = 14,
): Promise<ProductAnalytics> {
  const supabase = await createClient();
  const since = addDays(kstToday(), -(trendDays - 1));
  const sinceInstant = `${since}T00:00:00+09:00`;

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("analytics_reset_at")
    .eq("id", 1)
    .single();
  const resetAt = settingsRow?.analytics_reset_at ?? null;

  // 동향 그래프의 하한은 "최근 N일 시작"과 "마지막 리셋 시점" 중 더
  // 늦은 쪽 — 리셋이 그 안에 있으면 리셋 이전 날짜는 0으로 보인다.
  const trendSinceInstant =
    resetAt && resetAt > sinceInstant ? resetAt : sinceInstant;

  const viewRowsQuery = supabase
    .from("product_views")
    .select("product_id, viewed_at")
    .gte("viewed_at", trendSinceInstant);
  const reservationRowsQuery = supabase
    .from("reservations")
    .select("product_id, created_at")
    .gte("created_at", trendSinceInstant);

  const [{ data: products }, { data: viewRows }, { data: reservationRows }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .order("sort_order")
        .order("created_at"),
      viewRowsQuery,
      reservationRowsQuery,
    ]);

  // 상품별 전체 조회수·신청수는 위 동향 범위와 별개로, "마지막 리셋
  // 이후(없으면 전체 기간)" 누적을 다시 센다 — 표에는 이 누적 기준을
  // 보여주고, 동향 그래프만 최근 N일로 좁힌다. 목록 진입 수는 상품별로
  // 쪼갤 수 없는(특정 상품에 딸린 게 아닌) 숫자라 전체 개수만 센다.
  let allViewRowsQuery = supabase.from("product_views").select("product_id");
  let allReservationRowsQuery = supabase
    .from("reservations")
    .select("product_id");
  let listViewCountQuery = supabase
    .from("booking_list_views")
    .select("*", { count: "exact", head: true });
  if (resetAt) {
    allViewRowsQuery = allViewRowsQuery.gte("viewed_at", resetAt);
    allReservationRowsQuery = allReservationRowsQuery.gte(
      "created_at",
      resetAt,
    );
    listViewCountQuery = listViewCountQuery.gte("viewed_at", resetAt);
  }

  const [
    { data: allViewRows },
    { data: allReservationRows },
    { count: listViewCount },
    { data: recentListViews },
    { data: recentProductViews },
    { data: recentReservations },
  ] = await Promise.all([
    allViewRowsQuery,
    allReservationRowsQuery,
    listViewCountQuery,
    supabase
      .from("booking_list_views")
      .select("id, viewed_at")
      .order("viewed_at", { ascending: false })
      .limit(ACTIVITY_LOG_LIMIT),
    supabase
      .from("product_views")
      .select("id, viewed_at, product_id")
      .order("viewed_at", { ascending: false })
      .limit(ACTIVITY_LOG_LIMIT),
    supabase
      .from("reservations")
      .select("id, created_at, product_id")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LOG_LIMIT),
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

  // 각 소스별로 최근 ACTIVITY_LOG_LIMIT건씩 따로 가져온 뒤 합쳐서 다시
  // 최근순으로 자른다 — 한쪽 소스가 훨씬 자주 발생해도(예: 목록 진입이
  // 상품 상세 진입보다 훨씬 많음) 다른 소스가 로그에서 밀려나지 않는다.
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const recentActivity: ActivityLogEntry[] = [
    ...(recentListViews ?? []).map((row) => ({
      id: row.id,
      occurredAt: row.viewed_at,
      kind: "list_view" as const,
      productName: null,
    })),
    ...(recentProductViews ?? []).map((row) => ({
      id: row.id,
      occurredAt: row.viewed_at,
      kind: "product_view" as const,
      productName: productNameById.get(row.product_id) ?? null,
    })),
    ...(recentReservations ?? []).map((row) => ({
      id: row.id,
      occurredAt: row.created_at,
      kind: "reservation" as const,
      productName: productNameById.get(row.product_id) ?? null,
    })),
    // 리셋 자체도 로그에서 사라지면 안 되니(로그는 남겨두는 게 이
    // 기능의 요점이다) 한 줄로 끼워 넣는다 — 집계가 이 지점부터
    // 다시 시작됐다는 걸 로그만 보고도 알 수 있다.
    ...(resetAt
      ? [
          {
            id: "reset",
            occurredAt: resetAt,
            kind: "reset" as const,
            productName: null,
          },
        ]
      : []),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, ACTIVITY_LOG_LIMIT);

  return { rows, daily, listViews: listViewCount ?? 0, recentActivity };
}
