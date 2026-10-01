import type { Metadata } from "next";
import { loadRevenueSummary } from "@/lib/revenue/load";
import {
  parseRevenuePeriod,
  selectedExpenseMonth,
  type RevenueSummary,
} from "@/lib/revenue/summary";
import { RevenueDashboard } from "./revenue-dashboard";

export const metadata: Metadata = { title: "매출관리" };

export default async function RevenuePage({
  searchParams,
}: PageProps<"/admin/revenue">) {
  const params = await searchParams;
  const period = parseRevenuePeriod(params);
  const expenseMonth = selectedExpenseMonth(params.expenseMonth, period);
  let data: RevenueSummary | undefined;
  try {
    data = await loadRevenueSummary(period);
  } catch (error) {
    // 조회 실패를 빈 배열/0원으로 바꾸면 실제 매출이 없는 것처럼 보인다.
    console.error(
      "매출 집계 조회 실패",
      error instanceof Error ? error.message : "알 수 없는 오류",
    );
  }
  return (
    <RevenueDashboard period={period} data={data} expenseMonth={expenseMonth} />
  );
}
