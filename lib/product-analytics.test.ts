import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failure: "",
  ranges: [] as number[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        single: async () => ({
          data: mocks.tables[table]?.[0] ?? null,
          error: table === mocks.failure ? new Error("failed") : null,
        }),
        range: async (from: number, to: number) => {
          mocks.ranges.push(from);
          return {
            data:
              table === mocks.failure
                ? null
                : (mocks.tables[table] ?? []).slice(from, to + 1),
            count: (mocks.tables[table] ?? []).length,
            error: table === mocks.failure ? new Error("failed") : null,
          };
        },
      };
      return q;
    },
  }),
}));
import { loadProductAnalytics } from "./product-analytics";
const time = "2026-10-05T01:00:00.000Z";
beforeEach(() => {
  mocks.failure = "";
  mocks.ranges = [];
  mocks.tables = {
    settings: [
      {
        analytics_reset_at: null,
        analytics_last_seen_at: null,
        analytics_v2_started_at: time,
      },
    ],
    products: [{ id: "p", name: "상품" }],
    booking_list_views: [{ id: "l", ref: "old", memo: null, viewed_at: time }],
    product_views: [
      { id: "d", product_id: "p", ref: "old", memo: null, viewed_at: time },
    ],
    apply_views: [
      { id: "a", product_id: "p", ref: "old", memo: null, viewed_at: time },
    ],
    reservations: [
      {
        id: "legacy",
        product_id: "p",
        ref: "old",
        admin_memo: null,
        created_at: time,
        booking_origin: "legacy",
      },
      {
        id: "new",
        product_id: "p",
        ref: "new",
        admin_memo: null,
        created_at: time,
        booking_origin: "customer",
      },
      {
        id: "admin",
        product_id: "p",
        ref: null,
        admin_memo: null,
        created_at: time,
        booking_origin: "admin",
      },
    ],
    booking_events: [
      {
        id: "e",
        session_id: "s",
        attempt_id: "a",
        product_id: "p",
        reservation_id: "new",
        event_kind: "completed",
        ref: "new",
        device: "mobile",
        occurred_at: time,
        created_at: time,
        memo: null,
      },
    ],
  };
});
describe("과거 통계 연결", () => {
  it("과거와 새 접수를 중복 없이 연결하고 관리자 수기 등록은 제외한다", async () => {
    const data = await loadProductAnalytics();
    expect(data.rows[0].applications).toBe(2);
    expect(data.legacyCounts).toEqual({
      list: 1,
      detail: 1,
      form: 1,
      reservations: 1,
    });
    expect(data.flow.completions).toBe(1);
    expect(data.flow.unclassifiedReservations).toBe(1);
  });
  it("반환 한도를 넘는 과거 조회도 끝까지 읽는다", async () => {
    mocks.tables.product_views = Array.from({ length: 1201 }, (_, i) => ({
      id: String(i),
      product_id: "p",
      ref: null,
      viewed_at: time,
      memo: null,
    }));
    expect((await loadProductAnalytics()).rows[0].views).toBe(1201);
    expect(mocks.ranges).toContain(1000);
  });
  it("조회 실패를 0건 집계로 표시하지 않는다", async () => {
    mocks.failure = "booking_events";
    await expect(loadProductAnalytics()).rejects.toThrow();
  });
  it("리셋은 집계만 제한하며 과거 로그와 수집 시작 시점은 보존한다", async () => {
    mocks.tables.settings[0].analytics_reset_at = "2026-10-05T02:00:00Z";
    const data = await loadProductAnalytics();
    expect(data.rows[0].applications).toBe(0);
    expect(data.flow.completions).toBe(0);
    expect(data.flow.startedAt).toBe(time);
    expect(data.recentActivity.some((r) => r.id === "legacy")).toBe(true);
  });
});
