import Link from "next/link";
import { addMonths, kstDateString } from "@/lib/time";
import {
  formatProfitRate,
  REVENUE_STATUSES,
  revenueHref,
  validRevenueMonth,
  type RevenuePeriod,
  type RevenueSummary,
} from "@/lib/revenue/summary";
import { ExpenseSection } from "./expense-section";
import { MonthlyRevenueChart } from "./monthly-chart";
import {
  RevenueExpenseFilter,
  RevenuePeriodPicker,
  RevenueRetryButton,
} from "./period-controls";

const won = (n: number) => `${n.toLocaleString()}원`;
const moneyCell = "px-3 py-2 text-right whitespace-nowrap tabular-nums";
const STATUS_LABELS: Record<string, string> = {
  payment_confirmed: "입금확인",
  completed: "촬영완료",
  no_show: "노쇼",
};

function PeriodNavigation({
  period,
  basePath,
}: {
  period: RevenuePeriod;
  basePath: string;
}) {
  const step = period.view === "year" ? 12 : 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
      {([-1, 1] as const).map((direction) => {
        const target = addMonths(period.month, step * direction);
        const previous = direction === -1;
        const label = `${previous ? "이전" : "다음"} ${period.view === "year" ? "해" : "달"}`;
        return (
          <div key={direction} className={previous ? "order-1" : "order-3"}>
            {validRevenueMonth(target) ? (
              <Link
                prefetch={false}
                href={revenueHref(period.view, target, basePath)}
                aria-label={label}
                className="border-border bg-surface hover:bg-surface-subtle inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm"
              >
                {previous ? "←" : "→"}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="text-muted inline-flex h-10 w-10 items-center justify-center opacity-40"
              >
                {previous ? "←" : "→"}
              </span>
            )}
          </div>
        );
      })}
      <p
        className="order-2 min-w-24 text-center text-lg font-bold"
        aria-live="polite"
      >
        {period.year}년
        {period.view === "month" ? ` ${Number(period.month.slice(5))}월` : ""}
      </p>
      <div className="order-4">
        <RevenuePeriodPicker period={period} basePath={basePath} />
      </div>
    </div>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="text-muted bg-surface-subtle">
      <tr>
        {columns.map((s) => (
          <th
            key={s}
            scope="col"
            className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap"
          >
            {s}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function RevenueDashboard({
  period,
  data,
  expenseMonth,
  basePath = "/admin/revenue",
}: {
  period: RevenuePeriod;
  data?: RevenueSummary;
  expenseMonth?: string;
  basePath?: string;
}) {
  const yearly = period.view === "year";
  const heading = (
    <>
      <h1 className="text-2xl font-bold">매출관리</h1>
      <p className="text-muted mt-1 text-sm">
        촬영일 기준 실제 지불액을 집계합니다. 입금 전 신청과 취소는 제외합니다.
      </p>
      <div className="mt-6 mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <nav
          aria-label="매출 집계 방식"
          className="bg-surface-subtle inline-flex w-fit rounded-lg p-1"
        >
          {(["month", "year"] as const).map((view) => (
            <Link
              key={view}
              prefetch={false}
              href={revenueHref(view, period.month, basePath)}
              aria-current={period.view === view ? "page" : undefined}
              className={`rounded-md px-5 py-2 text-sm transition-colors ${period.view === view ? "bg-surface text-brand font-bold shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {view === "year" ? "연간 매출" : "월별 매출"}
            </Link>
          ))}
        </nav>
        <PeriodNavigation period={period} basePath={basePath} />
      </div>
    </>
  );
  if (!data)
    return (
      <div data-revenue-view={period.view}>
        {heading}
        <div
          role="alert"
          className="border-border bg-surface rounded-xl border p-6"
        >
          <h2 className="font-bold">매출 내역을 불러오지 못했습니다.</h2>
          <p className="text-muted mt-2 text-sm">
            조회에 실패해 집계 금액을 표시할 수 없습니다. 잠시 후 다시 불러와
            주십시오.
          </p>
          <RevenueRetryButton />
        </div>
      </div>
    );

  const { totals, products, months } = data;
  const displayedExpenses = expenseMonth
    ? data.expenses.filter((e) => e.month === expenseMonth)
    : data.expenses;
  const periodPrefix = expenseMonth
    ? `${expenseMonth}-`
    : yearly
      ? `${period.year}-`
      : `${period.month}-`;
  const today = kstDateString(new Date());
  const defaultDate = today.startsWith(periodPrefix)
    ? today
    : `${expenseMonth ?? period.startMonth}-01`;
  const cards = [
    {
      key: "revenue",
      label: "매출",
      amount: totals.revenue,
      description: `${REVENUE_STATUSES.map((s) => `${STATUS_LABELS[s]} ${totals.byStatus[s] ?? 0}건`).join(" · ")} · 총 ${totals.count}건`,
    },
    {
      key: "cost",
      label: "촬영 원가",
      amount: totals.cost,
      description: "예약별로 입력한 촬영 원가 합계",
    },
    {
      key: "other",
      label: "기타지출",
      amount: totals.other,
      description: `실제 등록한 일회성 지출 ${data.expenses.filter((e) => e.kind === "other").length}건`,
    },
    {
      key: "fixed",
      label: "고정지출",
      amount: totals.fixed,
      description: `실제 등록한 고정지출 ${data.expenses.filter((e) => e.kind === "fixed").length}건`,
    },
    {
      key: "profit",
      label: "순이익",
      amount: totals.netProfit,
      description: "매출 − 촬영 원가 − 기타·고정지출",
    },
  ];
  return (
    <div data-revenue-view={period.view}>
      {heading}
      <section
        aria-label={yearly ? "연간 매출 요약" : "월별 매출 요약"}
        className="grid grid-cols-2 gap-3 xl:grid-cols-5"
      >
        {cards.map((card) => (
          <div
            key={card.key}
            data-metric={card.key}
            className={`border-border bg-surface rounded-xl border p-4 ${card.key === "profit" ? "border-t-brand col-span-2 border-t-[3px] xl:col-span-1" : ""}`}
          >
            <p className="text-muted text-sm">{card.label}</p>
            <p
              className={`mt-2 text-lg font-bold tabular-nums sm:text-2xl ${card.amount < 0 ? "text-red-600 dark:text-red-400" : card.key === "profit" ? "text-brand" : ""}`}
            >
              {won(card.amount)}
            </p>
            <p className="text-muted mt-2 text-xs leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </section>
      {totals.unpricedCount > 0 ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          이 중 {totals.unpricedCount}건은 실제 지불액이 입력되지 않아 0원으로
          계산되었습니다. 예약 상세에서 실제 지불액을 입력해 주십시오.
        </p>
      ) : null}
      {yearly ? (
        <section
          aria-label="연간 월별 실적"
          className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
        >
          <div className="border-border bg-surface min-w-0 rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">월별 매출 · 순이익</h2>
              <div className="text-muted flex gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-sm bg-[#3f76b3]" />
                  매출
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-sm bg-[#78b5a6]" />
                  순이익
                </span>
              </div>
            </div>
            <MonthlyRevenueChart months={months} basePath={basePath} />
            <p className="text-muted mt-3 text-xs">
              월을 선택하면 해당 월의 매출 내역을 엽니다. 적자는 그래프의 0
              아래에 표시합니다.
            </p>
          </div>
          <div className="border-border bg-surface min-w-0 rounded-xl border p-5">
            <h2 className="text-lg font-bold">월별 실적</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {period.year}년 1~12월 매출·지출·순이익
                </caption>
                <TableHead
                  columns={["월", "건수", "매출", "지출 합계", "순이익"]}
                />
                <tbody>
                  {months.map((m) => (
                    <tr
                      key={m.month}
                      className="border-border border-b last:border-0"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-medium whitespace-nowrap"
                      >
                        <Link
                          prefetch={false}
                          href={revenueHref("month", m.month, basePath)}
                          className="text-brand hover:underline"
                        >
                          {Number(m.month.slice(5))}월 ↗
                        </Link>
                      </th>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.count}건
                      </td>
                      <td className={moneyCell}>{won(m.revenue)}</td>
                      <td className={moneyCell}>
                        {won(m.cost + m.other + m.fixed)}
                      </td>
                      <td
                        className={`${moneyCell} ${m.netProfit < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                      >
                        {won(m.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-border bg-surface-subtle border-t font-bold">
                  <tr>
                    <th scope="row" className="px-3 py-3 text-left">
                      합계
                    </th>
                    <td className="px-3 py-3">{totals.count}건</td>
                    <td className={moneyCell}>{won(totals.revenue)}</td>
                    <td className={moneyCell}>
                      {won(totals.cost + totals.other + totals.fixed)}
                    </td>
                    <td
                      className={`${moneyCell} ${totals.netProfit < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                    >
                      {won(totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      ) : null}
      <section
        className="border-border bg-surface mt-6 min-w-0 rounded-xl border p-5"
        aria-label="상품별 실적"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            {yearly ? "연간" : "월별"} 상품별 실적
          </h2>
          <p className="text-muted text-xs">
            수익률은 촬영 원가 대비 이익률입니다.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              상품별 예약 건수, 실제 매출, 촬영 원가와 촬영이익
            </caption>
            <TableHead
              columns={[
                "상품",
                "건수",
                "매출액",
                "촬영 원가",
                "촬영이익",
                "수익률",
              ]}
            />
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted px-3 py-8 text-center">
                    {yearly ? "이 해에는" : "이 달에는"} 집계할 예약이 없습니다.
                  </td>
                </tr>
              ) : (
                products.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border border-b last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-3 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {row.name}
                    </th>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.count}건
                    </td>
                    <td className={moneyCell}>{won(row.revenue)}</td>
                    <td className={moneyCell}>{won(row.cost)}</td>
                    <td
                      className={`${moneyCell} font-medium ${row.revenue - row.cost < 0 ? "text-red-600 dark:text-red-400" : ""}`}
                    >
                      {won(row.revenue - row.cost)}
                    </td>
                    <td className={moneyCell}>
                      {formatProfitRate(row.revenue, row.cost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {products.length > 0 ? (
              <tfoot className="border-border border-t font-bold">
                <tr>
                  <th scope="row" className="px-3 py-3 text-left">
                    합계
                  </th>
                  <td className="px-3 py-3">{totals.count}건</td>
                  <td className={moneyCell}>{won(totals.revenue)}</td>
                  <td className={moneyCell}>{won(totals.cost)}</td>
                  <td className={moneyCell}>
                    {won(totals.revenue - totals.cost)}
                  </td>
                  <td className={moneyCell}>
                    {formatProfitRate(totals.revenue, totals.cost)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <p className="text-muted mt-3 text-xs">
          촬영이익은 매출 − 촬영 원가입니다. 기타·고정지출을 반영한 전체
          순이익은 상단에서 확인합니다.
        </p>
      </section>
      {yearly ? (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">연간 지출 내역</h2>
            <p className="text-muted mt-1 text-xs">
              표시 월은 아래 내역에만 적용됩니다. 상단 집계는 연간 전체입니다.
            </p>
          </div>
          <RevenueExpenseFilter
            period={period}
            selected={expenseMonth}
            basePath={basePath}
          />
        </div>
      ) : null}
      <div className="grid min-w-0 gap-x-5 2xl:grid-cols-2">
        {(["other", "fixed"] as const).map((kind) => (
          <ExpenseSection
            key={kind}
            kind={kind}
            title={`${yearly ? (expenseMonth ? `${Number(expenseMonth.slice(5))}월` : "올해") : "이 달의"} ${kind === "other" ? "기타지출" : "고정지출"}`}
            hint={
              kind === "other"
                ? "촬영 건수와 무관하게 발생하는 일회성 지출입니다 (소모품, 수선, 잡비 등)."
                : "등록한 고정지출을 합산합니다 (임대료, 구독료, 장비 할부, 마케팅 등)."
            }
            emptyText={`표시할 ${kind === "other" ? "기타지출" : "고정지출"}이 없습니다.`}
            expenses={displayedExpenses.filter((e) => e.kind === kind)}
            defaultDate={defaultDate}
            periodPrefix={periodPrefix}
          />
        ))}
      </div>
    </div>
  );
}
