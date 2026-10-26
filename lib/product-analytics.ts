import "server-only";
import { loadActivityPage, type ActivityPage } from "@/lib/analytics/activity";
import { summaryEventKinds } from "@/lib/analytics/shared";
import { readAllRevenueRows } from "@/lib/revenue/pagination";
import { summarizeFlow, type FlowAnalytics } from "@/lib/analytics/summary";
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
  eventLabel?: string;
  /** ISO 문자열. */
  occurredAt: string;
  kind:
    | "list_view"
    | "product_view"
    | "apply_view"
    | "reservation"
    | "reset"
    | "booking_event";
  /** 목록 진입·리셋은 특정 상품이 없어 null. */
  productName: string | null;
  /** 관리자가 이 기록에 남긴 메모. 리셋 줄은 실제 행이 아니라 항상 null. */
  memo: string | null;
  /** 유입경로(?ref=값). 없으면 null(직접 방문). 리셋 줄은 항상 null. */
  ref: string | null;
};

export type HourlyPoint = {
  /** 0~23 (KST 기준). */
  hour: number;
  views: number;
};

/** 유입경로(ref)별 조회·신청 집계 한 줄. */
export type ChannelBreakdownRow = {
  /** ?ref= 값 그대로. 값이 없던 방문은 "(직접 방문)"으로 묶는다. */
  channel: string;
  views: number;
  applications: number;
  conversionRate: number | null;
};

/** 지난번 통계 화면 확인 시점 기준 스냅샷 — 지금 값과 비교해 변동치를
 * 보여주는 데 쓴다(app/admin/(dashboard)/analytics/last-seen-tracker.tsx가
 * 화면을 볼 때마다 그 시점을 settings.analytics_last_seen_at에 남긴다). */
export type ProductAnalyticsSnapshot = {
  listViews: number;
  applyViews: number;
  rows: ProductAnalyticsRow[];
  channelBreakdown: ChannelBreakdownRow[];
};

export type ProductAnalytics = {
  flow: FlowAnalytics;
  activityPage?: ActivityPage;
  legacyCounts: {
    list: number;
    detail: number;
    form: number;
    reservations: number;
  };
  rows: ProductAnalyticsRow[];
  /** 최근 trendDays일, 전 상품 합계(사이트 전체 동향용). 날짜 오름차순. */
  daily: DailyAnalyticsPoint[];
  /** 상품 목록(예약하기 첫 화면) 진입 수 — 마지막 리셋 이후(없으면 전체) 누적. */
  listViews: number;
  /** 신청서 화면 진입 수 — 마지막 리셋 이후(없으면 전체) 누적. 상품 상세
   * 진입과 실제 예약 사이의 이탈 지점(날짜·시간 선택 vs 신청서 작성)을
   * 가른다. */
  applyViews: number;
  /** 0~23시(KST) 시간대별 조회수 — 마지막 리셋 이후 누적. */
  hourly: HourlyPoint[];
  /** 유입경로(ref)별 조회·신청 집계. 조회수 내림차순. */
  channelBreakdown: ChannelBreakdownRow[];
  /** 최근 발생 순(내림차순)으로 최근 ACTIVITY_LOG_LIMIT건. 리셋과 무관하게
   * 항상 전체 기록을 보여준다(리셋 시점 자체도 한 줄로 섞여 나온다). */
  recentActivity: ActivityLogEntry[];
  /** 통계 화면을 마지막으로 연 시점(ISO). 연 적이 없으면 null. */
  lastSeenAt: string | null;
  /** lastSeenAt 시점 기준 스냅샷 — 지금 값과 이 값의 차이가 변동치다.
   * lastSeenAt이 없으면(한 번도 연 적 없으면) null — 비교 기준이 없어
   * 변동치를 보여줄 수 없다. */
  previous: ProductAnalyticsSnapshot | null;
};

export async function loadProductAnalytics(
  trendDays = 14,
): Promise<ProductAnalytics> {
  const db = await createClient();
  const settings = await db
    .from("settings")
    .select("analytics_reset_at,analytics_last_seen_at,analytics_v2_started_at")
    .eq("id", 1)
    .single();
  if (settings.error || !settings.data)
    throw new Error("통계 설정을 불러오지 못했습니다.");
  const all = <T>(
    fetch: (
      from: number,
      to: number,
    ) => PromiseLike<{
      data: T[] | null;
      count: number | null;
      error: unknown;
    }>,
  ) =>
    readAllRevenueRows(fetch).catch(() => {
      throw new Error("통계 집계 데이터를 불러오지 못했습니다.");
    });
  const [products, list, detail, form, reservations, events, activityPage] =
    await Promise.all([
      all((f, t) =>
        db
          .from("products")
          .select("id,name", f === 0 ? { count: "exact" } : {})
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("booking_list_views")
          .select("id,ref,memo,viewed_at", f === 0 ? { count: "exact" } : {})
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("product_views")
          .select(
            "id,product_id,ref,memo,viewed_at",
            f === 0 ? { count: "exact" } : {},
          )
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("apply_views")
          .select(
            "id,product_id,ref,memo,viewed_at",
            f === 0 ? { count: "exact" } : {},
          )
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("reservations")
          .select("id,product_id,ref,admin_memo,created_at,booking_origin", {
            count: "exact",
          })
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("booking_events")
          .select(
            "id,session_id,attempt_id,product_id,reservation_id,event_kind,ref,device,form_version,field_id,field_label,field_order,duration_ms,error_code,memo,occurred_at,created_at",
            f === 0 ? { count: "exact" } : {},
          )
          .in("event_kind", [...summaryEventKinds])
          .order("id")
          .range(f, t),
      ),
      loadActivityPage(db),
    ]);
  const reset = settings.data.analytics_reset_at;
  const afterReset = (time: string) =>
    !reset || Date.parse(time) >= Date.parse(reset);
  const filteredEvents = events.filter((e) => afterReset(e.occurred_at));
  const first =
    settings.data.analytics_v2_started_at ??
    events.reduce<string | null>(
      (min, e) =>
        !min || Date.parse(e.occurred_at) < Date.parse(min)
          ? e.occurred_at
          : min,
      null,
    );
  const legacyReservations = reservations.filter(
    (r) => (r.booking_origin ?? "legacy") === "legacy",
  );
  const byReservation = new Map(reservations.map((r) => [r.id, r]));
  const eventIds = new Set(events.map((e) => e.id));
  const completed = new Set(
    events
      .filter((e) => e.event_kind === "completed")
      .map((e) => e.reservation_id),
  );
  // 예약 저장은 성공했지만 이벤트가 없는 건도 실제 접수 건수에서 빠뜨리지 않습니다.
  const customerFallback = reservations.filter(
    (r) => r.booking_origin === "customer" && !completed.has(r.id),
  );
  const sourceViews = [
    ...list.map((r) => ({
      ...r,
      product_id: null as string | null,
      kind: "list_view" as const,
    })),
    ...detail.map((r) => ({ ...r, kind: "product_view" as const })),
    ...form.map((r) => ({ ...r, kind: "apply_view" as const })),
    ...events
      .filter((e) =>
        ["list_view", "detail_view", "times_view", "form_view"].includes(
          e.event_kind,
        ),
      )
      .map((e) => ({
        id: e.id,
        product_id: e.product_id,
        ref: e.ref,
        memo: e.memo,
        viewed_at: e.occurred_at,
        kind: (e.event_kind === "list_view"
          ? "list_view"
          : e.event_kind === "form_view"
            ? "apply_view"
            : "product_view") as "list_view" | "apply_view" | "product_view",
      })),
  ];
  const apps = [...legacyReservations, ...customerFallback].map((r) => ({
    id: r.id,
    product_id: r.product_id,
    ref: r.ref,
    memo: r.admin_memo,
    created_at: r.created_at,
  }));
  apps.push(
    ...events
      .filter((e) => e.event_kind === "completed")
      .map((e) => ({
        id: e.reservation_id ?? e.id,
        product_id: e.product_id ?? "",
        ref: e.ref,
        memo:
          (e.reservation_id
            ? byReservation.get(e.reservation_id)?.admin_memo
            : null) ?? e.memo,
        created_at: e.occurred_at,
      })),
  );
  const catalog = new Map(products.map((p) => [p.id, p.name]));
  for (const id of [
    ...sourceViews
      .filter((r) => r.kind === "product_view")
      .map((r) => r.product_id ?? ""),
    ...apps.map((r) => r.product_id),
  ])
    if (!catalog.has(id)) catalog.set(id, "(삭제된 상품)");
  const countAt = (cutoff: string | null) => {
    const views = sourceViews.filter(
      (r) =>
        afterReset(r.viewed_at) &&
        (!cutoff || Date.parse(r.viewed_at) <= Date.parse(cutoff)),
    );
    const submitted = apps.filter(
      (r) =>
        afterReset(r.created_at) &&
        (!cutoff || Date.parse(r.created_at) <= Date.parse(cutoff)),
    );
    const productCounts = new Map<
      string,
      { views: number; applications: number }
    >();
    const channelCounts = new Map<
      string,
      { views: number; applications: number }
    >();
    function add(
      map: Map<string, { views: number; applications: number }>,
      key: string,
      metric: "views" | "applications",
    ) {
      const value = map.get(key) ?? { views: 0, applications: 0 };
      value[metric]++;
      map.set(key, value);
    }
    let listViews = 0,
      applyViews = 0;
    for (const row of views) {
      if (row.kind === "list_view") listViews++;
      if (row.kind === "apply_view") applyViews++;
      if (row.kind === "product_view")
        add(productCounts, row.product_id ?? "", "views");
      add(channelCounts, row.ref?.trim() || "(직접 방문)", "views");
    }
    for (const row of submitted) {
      add(productCounts, row.product_id, "applications");
      add(channelCounts, row.ref?.trim() || "(직접 방문)", "applications");
    }
    return {
      listViews,
      applyViews,
      rows: [...catalog].map(([productId, productName]) => {
        const counts = productCounts.get(productId) ?? {
          views: 0,
          applications: 0,
        };
        return {
          productId,
          productName,
          ...counts,
          conversionRate: counts.views
            ? (counts.applications / counts.views) * 100
            : null,
        };
      }),
      channelBreakdown: [...channelCounts]
        .map(([channel, counts]) => ({
          channel,
          ...counts,
          conversionRate: counts.views
            ? (counts.applications / counts.views) * 100
            : null,
        }))
        .sort((a, b) => b.views - a.views),
    };
  };
  const snapshot = countAt(null);
  const lastSeenAt =
    settings.data.analytics_last_seen_at &&
    (!reset ||
      Date.parse(settings.data.analytics_last_seen_at) > Date.parse(reset))
      ? settings.data.analytics_last_seen_at
      : null;
  const since = addDays(kstToday(), -(trendDays - 1));
  const dayCounts = new Map<string, { views: number; applications: number }>();
  const hourCounts = Array<number>(24).fill(0);
  for (const row of sourceViews) {
    if (!afterReset(row.viewed_at)) continue;
    const date = new Date(row.viewed_at),
      key = kstDateString(date);
    const value = dayCounts.get(key) ?? { views: 0, applications: 0 };
    value.views++;
    dayCounts.set(key, value);
    hourCounts[(date.getUTCHours() + 9) % 24]++;
  }
  for (const row of apps) {
    if (!afterReset(row.created_at)) continue;
    const key = kstDateString(new Date(row.created_at));
    const value = dayCounts.get(key) ?? { views: 0, applications: 0 };
    value.applications++;
    dayCounts.set(key, value);
  }
  const daily = Array.from({ length: trendDays }, (_, i) => {
    const date = addDays(since, i);
    return { date, ...(dayCounts.get(date) ?? { views: 0, applications: 0 }) };
  });
  const hourly = hourCounts.map((views, hour) => ({ hour, views }));
  const names = catalog;
  const recentActivity: ActivityLogEntry[] = [
    ...sourceViews
      .filter((r) => !eventIds.has(r.id))
      .map((r) => ({
        id: r.id,
        occurredAt: r.viewed_at,
        kind: r.kind,
        productName: r.product_id ? (names.get(r.product_id) ?? null) : null,
        memo: r.memo,
        ref: r.ref,
      })),
    ...reservations.map((r) => ({
      id: r.id,
      occurredAt: r.created_at,
      kind: "reservation" as const,
      productName: names.get(r.product_id) ?? null,
      memo: r.admin_memo,
      ref: r.ref,
    })),
    ...(reset
      ? [
          {
            id: "reset",
            occurredAt: reset,
            kind: "reset" as const,
            productName: null,
            memo: null,
            ref: null,
          },
        ]
      : []),
  ]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 100);
  return {
    ...snapshot,
    activityPage,
    daily,
    hourly,
    recentActivity,
    lastSeenAt,
    previous: lastSeenAt ? countAt(lastSeenAt) : null,
    legacyCounts: {
      list: list.filter((r) => afterReset(r.viewed_at)).length,
      detail: detail.filter((r) => afterReset(r.viewed_at)).length,
      form: form.filter((r) => afterReset(r.viewed_at)).length,
      reservations: legacyReservations.filter((r) => afterReset(r.created_at))
        .length,
    },
    flow: summarizeFlow(
      filteredEvents,
      first,
      legacyReservations.filter((r) => afterReset(r.created_at)).length,
    ),
  };
}
