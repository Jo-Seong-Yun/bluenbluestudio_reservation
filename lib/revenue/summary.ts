import { addMonths, kstMonthString, kstToInstant } from "@/lib/time";
import type { DateString } from "@/lib/time";
import type { ReservationStatus } from "@/lib/supabase/database.types";

export const REVENUE_STATUSES: ReservationStatus[] = [
  "payment_confirmed",
  "completed",
  "no_show",
];

export type RevenuePeriod = {
  view: "month" | "year";
  year: number;
  month: string;
  startMonth: string;
  endMonth: string;
  from: string;
  to: string;
};

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function validRevenueMonth(value: string | undefined): value is string {
  return Boolean(
    value &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 1900 &&
    Number(value.slice(0, 4)) <= 9998,
  );
}

export function parseRevenuePeriod(
  params: SearchParams,
  today = new Date(),
): RevenuePeriod {
  const rawMonth = first(params.month);
  const selectedMonth = validRevenueMonth(rawMonth)
    ? rawMonth
    : kstMonthString(today);
  const view = first(params.view) === "year" ? "year" : "month";
  const rawYear = first(params.year);
  const validYear =
    rawYear &&
    /^\d{4}$/.test(rawYear) &&
    Number(rawYear) >= 1900 &&
    Number(rawYear) <= 9998;
  const year =
    view === "year" && validYear
      ? Number(rawYear)
      : Number(selectedMonth.slice(0, 4));
  // 연도를 바꾼 뒤 월별로 돌아오면 마지막 월 번호를 같은 연도에 적용한다.
  const month = `${year}-${selectedMonth.slice(5)}`;
  const startMonth = view === "year" ? `${year}-01` : month;
  const endMonth = addMonths(startMonth, view === "year" ? 12 : 1);
  return {
    view,
    year,
    month,
    startMonth,
    endMonth,
    from: kstToInstant(`${startMonth}-01` as DateString, "00:00").toISOString(),
    to: kstToInstant(`${endMonth}-01` as DateString, "00:00").toISOString(),
  };
}

export function revenueHref(
  view: RevenuePeriod["view"],
  month: string,
  basePath = "/admin/revenue",
  expenseMonth?: string,
) {
  const params = new URLSearchParams({ view, month });
  if (view === "year") params.set("year", month.slice(0, 4));
  if (view === "year" && expenseMonth) params.set("expenseMonth", expenseMonth);
  return `${basePath}?${params}`;
}

export function selectedExpenseMonth(
  value: string | string[] | undefined,
  period: RevenuePeriod,
) {
  const month = first(value);
  return period.view === "year" &&
    validRevenueMonth(month) &&
    Number(month.slice(0, 4)) === period.year
    ? month
    : undefined;
}

export type RevenueReservation = {
  id: string;
  status: ReservationStatus;
  product_id: string;
  shoot_start: string | null;
  charged_amount: number | null;
  estimated_amount?: number | null;
  cost: number | null;
};
export type RevenueProduct = { id: string; name: string };
export type RevenueExpense = {
  id: string;
  month: string;
  date: string | null;
  label: string;
  amount: number;
  memo: string | null;
  kind: string;
};

export type RevenueTotals = {
  revenue: number;
  cost: number;
  other: number;
  fixed: number;
  netProfit: number;
  count: number;
  unpricedCount: number;
  byStatus: Partial<Record<ReservationStatus, number>>;
};
export type MonthlyRevenue = RevenueTotals & { month: string };
export type ProductRevenue = {
  id: string;
  name: string;
  count: number;
  revenue: number;
  cost: number;
};
export type RevenueSummary = {
  totals: RevenueTotals;
  months: MonthlyRevenue[];
  products: ProductRevenue[];
  expenses: RevenueExpense[];
};

const emptyTotals = (): RevenueTotals => ({
  revenue: 0,
  cost: 0,
  other: 0,
  fixed: 0,
  netProfit: 0,
  count: 0,
  unpricedCount: 0,
  byStatus: {},
});

/** 월·연 모두 같은 규칙을 사용해야 연간 합계가 12개월 합과 일치한다. */
export function summarizeRevenue(
  period: RevenuePeriod,
  reservations: RevenueReservation[],
  products: RevenueProduct[],
  expenses: RevenueExpense[],
): RevenueSummary {
  const months = Array.from(
    { length: period.view === "year" ? 12 : 1 },
    (_, i) => ({ month: addMonths(period.startMonth, i), ...emptyTotals() }),
  );
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const byProduct = new Map<string, ProductRevenue>();
  const productNames = new Map(products.map((p) => [p.id, p.name]));
  for (const r of reservations) {
    if (!REVENUE_STATUSES.includes(r.status) || !r.shoot_start) continue;
    const instant = new Date(r.shoot_start);
    if (!Number.isFinite(instant.getTime())) continue;
    const bucket = byMonth.get(kstMonthString(instant));
    if (!bucket) continue;
    bucket.count += 1;
    bucket.revenue += r.charged_amount ?? 0;
    bucket.cost += r.cost ?? 0;
    bucket.unpricedCount += r.charged_amount === null ? 1 : 0;
    bucket.byStatus[r.status] = (bucket.byStatus[r.status] ?? 0) + 1;
    const product = byProduct.get(r.product_id) ?? {
      id: r.product_id,
      name: productNames.get(r.product_id) ?? "(삭제된 상품)",
      count: 0,
      revenue: 0,
      cost: 0,
    };
    product.count += 1;
    product.revenue += r.charged_amount ?? 0;
    product.cost += r.cost ?? 0;
    byProduct.set(r.product_id, product);
  }
  const includedExpenses = expenses.filter((e) => {
    const bucket = byMonth.get(e.month);
    if (!bucket || (e.kind !== "other" && e.kind !== "fixed")) return false;
    // 과거 일자 없는 항목도 기존 month 키로 집계하며 고정비를 12배 하지 않는다.
    bucket[e.kind] += e.amount;
    return true;
  });
  const totals = emptyTotals();
  for (const m of months) {
    m.netProfit = m.revenue - m.cost - m.other - m.fixed;
    totals.revenue += m.revenue;
    totals.cost += m.cost;
    totals.other += m.other;
    totals.fixed += m.fixed;
    totals.netProfit += m.netProfit;
    totals.count += m.count;
    totals.unpricedCount += m.unpricedCount;
    for (const status of REVENUE_STATUSES) {
      totals.byStatus[status] =
        (totals.byStatus[status] ?? 0) + (m.byStatus[status] ?? 0);
    }
  }
  return {
    totals,
    months,
    products: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue),
    expenses: includedExpenses,
  };
}

export function formatProfitRate(revenue: number, cost: number) {
  return cost === 0 ? "-" : `${(((revenue - cost) / cost) * 100).toFixed(1)}%`;
}
