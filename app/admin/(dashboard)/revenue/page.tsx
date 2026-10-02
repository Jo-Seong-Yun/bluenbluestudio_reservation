import type { Metadata } from "next";
import { loadBankBalanceData } from "@/lib/revenue/bank-load";
import type { BankBalanceData } from "@/lib/revenue/bank-balance";
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
  const [revenueResult, bankResult] = await Promise.allSettled([
    loadRevenueSummary(period),
    loadBankBalanceData(),
  ]);
  const data: RevenueSummary | undefined =
    revenueResult.status === "fulfilled" ? revenueResult.value : undefined;
  const bankData: BankBalanceData | undefined =
    bankResult.status === "fulfilled" ? bankResult.value : undefined;
  for (const result of [revenueResult, bankResult]) {
    if (result.status === "rejected")
      console.error(
        "매출/통장 집계 조회 실패",
        result.reason instanceof Error
          ? result.reason.message
          : "알 수 없는 오류",
      );
  }
  return (
    <RevenueDashboard
      period={period}
      data={data}
      expenseMonth={expenseMonth}
      bankData={bankData}
    />
  );
}
