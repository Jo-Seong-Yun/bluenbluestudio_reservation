import "server-only";
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
  ) => readAllRevenueRows(fetch);
  const [products, list, detail, form, reservations, events] =
    await Promise.all([
      all((f, t) =>
        db
          .from("products")
          .select("id,name", { count: "exact" })
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("booking_list_views")
          .select("id,ref,memo,viewed_at", { count: "exact" })
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("product_views")
          .select("id,product_id,ref,memo,viewed_at", { count: "exact" })
          .order("id")
          .range(f, t),
      ),
      all((f, t) =>
        db
          .from("apply_views")
          .select("id,product_id,ref,memo,viewed_at", { count: "exact" })
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
          .select("*", { count: "exact" })
          .order("id")
          .range(f, t),
      ),
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
    const rows = [...catalog].map(([id, name]) => {
      const p = { id, name };
      const count = views.filter(
        (r) => (r.product_id ?? "") === p.id && r.kind === "product_view",
      ).length;
      const applications = submitted.filter(
        (r) => r.product_id === p.id,
      ).length;
      return {
        productId: p.id,
        productName: p.name,
        views: count,
        applications,
        conversionRate: count ? (applications / count) * 100 : null,
      };
    });
    const channels = [
      ...new Set([
        ...views.map((r) => r.ref?.trim() || "(직접 방문)"),
        ...submitted.map((r) => r.ref?.trim() || "(직접 방문)"),
      ]),
    ];
    return {
      listViews: views.filter((r) => r.kind === "list_view").length,
      applyViews: views.filter((r) => r.kind === "apply_view").length,
      rows,
      channelBreakdown: channels
        .map((channel) => {
          const count = views.filter(
            (r) => (r.ref?.trim() || "(직접 방문)") === channel,
          ).length;
          const applications = submitted.filter(
            (r) => (r.ref?.trim() || "(직접 방문)") === channel,
          ).length;
          return {
            channel,
            views: count,
            applications,
            conversionRate: count ? (applications / count) * 100 : null,
          };
        })
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
  const daily = Array.from({ length: trendDays }, (_, i) => {
    const date = addDays(since, i);
    return {
      date,
      views: sourceViews.filter(
        (r) =>
          afterReset(r.viewed_at) &&
          kstDateString(new Date(r.viewed_at)) === date,
      ).length,
      applications: apps.filter(
        (r) =>
          afterReset(r.created_at) &&
          kstDateString(new Date(r.created_at)) === date,
      ).length,
    };
  });
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    views: sourceViews.filter(
      (r) =>
        afterReset(r.viewed_at) &&
        (new Date(r.viewed_at).getUTCHours() + 9) % 24 === hour,
    ).length,
  }));
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
    ...events
      .filter((e) => e.event_kind !== "completed")
      .map((e) => ({
        id: e.id,
        occurredAt: e.occurred_at,
        kind: "booking_event" as const,
        eventLabel:
          (
            {
              list_view: "상품 목록",
              detail_view: "상품 상세",
              times_view: "희망 시간",
              form_view: "신청서 진입",
              review_view: "내용 확인",
              field_view: "문항 펼침",
              field_valid: "유효 답변",
              field_invalid: "답변 미완료",
              field_error: "문항 오류",
              submit_attempt: "제출 시도",
              submit_error: "제출 실패",
            } as Record<string, string>
          )[e.event_kind] ?? "예약 진행",
        productName: e.product_id ? (names.get(e.product_id) ?? null) : null,
        memo: e.memo,
        ref: e.ref,
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
