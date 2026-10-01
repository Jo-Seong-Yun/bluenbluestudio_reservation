import { describe, expect, it } from "vitest";
import {
  formatProfitRate,
  parseRevenuePeriod,
  revenueHref,
  selectedExpenseMonth,
  summarizeRevenue,
  type RevenueExpense,
  type RevenueReservation,
} from "./summary";

const now = new Date("2026-09-30T15:10:00Z");
const r = (
  overrides: Partial<RevenueReservation> = {},
): RevenueReservation => ({
  id: "r1",
  product_id: "p1",
  status: "completed",
  shoot_start: "2026-10-01T01:00:00Z",
  charged_amount: 100000,
  cost: 20000,
  ...overrides,
});
const e = (overrides: Partial<RevenueExpense> = {}): RevenueExpense => ({
  id: "e1",
  month: "2026-10",
  date: "2026-10-01",
  label: "지출",
  amount: 5000,
  memo: null,
  kind: "other",
  ...overrides,
});
const products = [{ id: "p1", name: "독백" }];

describe("매출 집계 기간", () => {
  it("기존 month 링크는 월별 화면이며 기본 월은 KST 기준이다", () => {
    expect(parseRevenuePeriod({ month: "2026-09" }, now)).toMatchObject({
      view: "month",
      month: "2026-09",
    });
    expect(parseRevenuePeriod({}, now).month).toBe("2026-10");
  });
  it("연간 범위는 KST 1월 1일부터 다음 해 1월 1일 미만이다", () => {
    expect(
      parseRevenuePeriod({ view: "year", year: "2026" }, now),
    ).toMatchObject({
      from: "2025-12-31T15:00:00.000Z",
      to: "2026-12-31T15:00:00.000Z",
      startMonth: "2026-01",
      endMonth: "2027-01",
    });
  });
  it.each(["2026-00", "2026-13", "2026-10bad", "bad", "1800-10"])(
    "잘못된 월 %s를 기본 월로 대체한다",
    (month) => {
      expect(parseRevenuePeriod({ month }, now).month).toBe("2026-10");
    },
  );
  it("연도를 변경해도 마지막 월 번호를 유지한다", () => {
    const annual = parseRevenuePeriod(
      { view: ["year"], year: "2025", month: "2026-09" },
      now,
    );
    expect(annual.month).toBe("2025-09");
    const link = revenueHref("month", annual.month);
    expect(
      parseRevenuePeriod(
        Object.fromEntries(new URL(link, "https://example.test").searchParams),
        now,
      ),
    ).toMatchObject({ view: "month", month: "2025-09" });
  });
  it("잘못된 연도는 선택한 월의 연도를 사용한다", () => {
    expect(
      parseRevenuePeriod({ view: "year", year: "NaN", month: "2024-02" }, now)
        .year,
    ).toBe(2024);
  });
  it("지출 표시 월은 선택한 연도 안에서만 적용한다", () => {
    const period = parseRevenuePeriod({ view: "year", year: "2026" }, now);
    expect(selectedExpenseMonth("2026-09", period)).toBe("2026-09");
    expect(selectedExpenseMonth("2025-09", period)).toBeUndefined();
    expect(selectedExpenseMonth("2026-13", period)).toBeUndefined();
    expect(
      selectedExpenseMonth("2026-09", parseRevenuePeriod({}, now)),
    ).toBeUndefined();
  });
});

describe("월·연 매출 집계", () => {
  it("입금확인·촬영완료·노쇼만 실제 지불액으로 집계한다", () => {
    const reservations = [
      r(),
      r({ status: "payment_confirmed", charged_amount: 50000 }),
      r({ status: "no_show", charged_amount: 30000 }),
      r({ status: "requested" }),
      r({ status: "schedule_confirmed" }),
      r({ status: "cancelled" }),
    ];
    const summary = summarizeRevenue(
      parseRevenuePeriod({}, now),
      reservations,
      products,
      [],
    );
    expect(summary.totals).toMatchObject({
      count: 3,
      revenue: 180000,
      cost: 60000,
      netProfit: 120000,
    });
  });
  it("UTC 연도와 다른 KST 연도 경계를 정확히 분류한다", () => {
    const annual = parseRevenuePeriod({ view: "year", year: "2026" }, now);
    const result = summarizeRevenue(
      annual,
      [
        r({ shoot_start: "2025-12-31T14:59:59Z" }),
        r({ shoot_start: "2025-12-31T15:00:00Z" }),
        r({ shoot_start: "2026-12-31T14:59:59Z" }),
        r({ shoot_start: "2026-12-31T15:00:00Z" }),
        r({ shoot_start: null }),
      ],
      products,
      [],
    );
    expect(result.totals.count).toBe(2);
    expect(result.months[0].count).toBe(1);
    expect(result.months[11].count).toBe(1);
  });
  it("연간 합계는 12개 월별 집계의 합이며 고정비는 등록한 만큼만 합한다", () => {
    const annual = parseRevenuePeriod({ view: "year", year: "2026" }, now);
    const reservations = [
      r(),
      r({
        shoot_start: "2026-01-31T15:00:00Z",
        charged_amount: 75000,
        cost: null,
      }),
    ];
    const expenses = [
      e({ kind: "fixed", amount: 30000 }),
      e({ month: "2026-02", date: null, amount: 7000 }),
      e({ month: "2025-12", amount: 999999 }),
    ];
    const result = summarizeRevenue(annual, reservations, products, expenses);
    expect(result.months).toHaveLength(12);
    expect(result.totals).toMatchObject({
      revenue: 175000,
      cost: 20000,
      fixed: 30000,
      other: 7000,
      netProfit: 118000,
    });
    for (const metric of [
      "revenue",
      "cost",
      "fixed",
      "other",
      "netProfit",
      "count",
    ] as const) {
      const sum = result.months.reduce(
        (n, m) =>
          n +
          summarizeRevenue(
            parseRevenuePeriod({ month: m.month }, now),
            reservations,
            products,
            expenses,
          ).totals[metric],
        0,
      );
      expect(result.totals[metric]).toBe(sum);
    }
    expect(result.expenses).toHaveLength(2);
  });
  it("0원 입력은 미입력으로 세지 않고 삭제된 상품·미입력 원가를 보존한다", () => {
    const result = summarizeRevenue(
      parseRevenuePeriod({}, now),
      [
        r({ charged_amount: null }),
        r({ charged_amount: 0, cost: null, product_id: "deleted" }),
      ],
      products,
      [],
    );
    expect(result.totals).toMatchObject({
      count: 2,
      unpricedCount: 1,
      revenue: 0,
      cost: 20000,
      netProfit: -20000,
    });
    expect(result.products.find((p) => p.id === "deleted")?.name).toBe(
      "(삭제된 상품)",
    );
  });
  it("예약 없이 지출만 있는 월도 적자로 집계하고 무자료 월은 0이다", () => {
    const result = summarizeRevenue(
      parseRevenuePeriod({ view: "year" }, now),
      [],
      [],
      [e({ kind: "fixed", amount: 50000 })],
    );
    expect(result.months[9].netProfit).toBe(-50000);
    expect(result.months[0].netProfit).toBe(0);
  });
  it("윤년 2월과 현재 원가 대비 수익률을 유지한다", () => {
    const period = parseRevenuePeriod({ month: "2024-02" }, now);
    expect(period.to).toBe("2024-02-29T15:00:00.000Z");
    expect(formatProfitRate(100000, 20000)).toBe("400.0%");
    expect(formatProfitRate(100000, 0)).toBe("-");
  });
});
