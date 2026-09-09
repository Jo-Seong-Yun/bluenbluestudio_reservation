import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addMonths, kstMonthString } from "@/lib/time";
import type { ReservationStatus } from "@/lib/supabase/database.types";
import { inputClass } from "@/components/ui";
import { SubmitButton, PendingSubmit } from "@/components/submit-button";
import { addMonthlyExpense, deleteMonthlyExpense } from "@/app/admin/actions";

export const metadata: Metadata = { title: "매출관리" };

/**
 * 매출로 치는 예약 상태.
 *
 * "신청만 됨"(requested)은 입금 전이라 빼고, "취소"(cancelled)도 뺀다.
 * "노쇼"(no_show)는 넣는다 — 예약금을 돌려주지 않으니 매출로 잡는 게 맞다.
 *
 * 매출액은 상품 정가가 아니라 예약별로 관리자가 직접 입력하는 실제
 * 지불액(charged_amount) 기준이다 — 할인 이벤트 등으로 건마다 실제
 * 받는 금액이 다를 수 있어서다. 아직 입력하지 않은 예약은 0으로 본다.
 */
const REVENUE_STATUSES: ReservationStatus[] = [
  "confirmed",
  "completed",
  "no_show",
];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "확정",
  completed: "완료",
  no_show: "노쇼",
};

export default async function RevenuePage({
  searchParams,
}: PageProps<"/admin/revenue">) {
  const { month: monthParam } = await searchParams;
  const month =
    (Array.isArray(monthParam) ? monthParam[0] : monthParam) ??
    kstMonthString(new Date());

  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const [year, m] = month.split("-").map(Number);

  const supabase = await createClient();

  const [{ data: reservations }, { data: products }, { data: expenses }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("id, status, product_id, charged_amount, cost")
        .gte("shoot_start", `${month}-01T00:00:00+09:00`)
        .lt("shoot_start", `${nextMonth}-01T00:00:00+09:00`)
        .in("status", REVENUE_STATUSES),
      supabase.from("products").select("id, name").order("sort_order"),
      supabase
        .from("monthly_expenses")
        .select("id, label, amount")
        .eq("month", month)
        .order("created_at"),
    ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const byProduct = new Map<
    string,
    { name: string; count: number; revenue: number; cost: number }
  >();
  const byStatus: Partial<Record<ReservationStatus, number>> = {};

  for (const r of reservations ?? []) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    const product = productById.get(r.product_id);
    const entry = byProduct.get(r.product_id) ?? {
      name: product?.name ?? "(삭제된 상품)",
      count: 0,
      revenue: 0,
      cost: 0,
    };
    entry.count += 1;
    entry.revenue += r.charged_amount ?? 0;
    entry.cost += r.cost ?? 0;
    byProduct.set(r.product_id, entry);
  }

  const rows = [...byProduct.entries()]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalCount = reservations?.length ?? 0;
  const unpricedCount = (reservations ?? []).filter(
    (r) => r.charged_amount === null,
  ).length;

  const fixedExpenses = expenses ?? [];
  const totalFixedExpenses = fixedExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const netProfit = totalRevenue - totalCost - totalFixedExpenses;

  return (
    <div>
      <h1 className="text-2xl font-bold">매출관리</h1>
      <p className="text-muted mt-1 text-sm">
        확정·완료·노쇼 처리된 예약을 예약별 실제 지불액 기준으로 집계해요.
        취소된 예약과 입금 전 신청은 빠져 있어요.
      </p>

      {unpricedCount > 0 ? (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          이 중 {unpricedCount}건은 아직 지불액이 입력되지 않아 0원으로
          계산됐어요. 예약 상세에서 실제 지불액을 입력해주세요.
        </p>
      ) : null}

      <div className="mt-6 mb-4 flex items-center justify-between">
        <Link
          href={`/admin/revenue?month=${prevMonth}`}
          aria-label="이전 달"
          className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
        >
          ←
        </Link>
        <p className="font-bold">
          {year}년 {m}월
        </p>
        <Link
          href={`/admin/revenue?month=${nextMonth}`}
          aria-label="다음 달"
          className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
        >
          →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">매출</p>
          <p className="mt-1 text-2xl font-bold">
            {totalRevenue.toLocaleString()}원
          </p>
          <p className="text-muted mt-1 text-xs">
            {REVENUE_STATUSES.map(
              (status) => `${STATUS_LABELS[status]} ${byStatus[status] ?? 0}건`,
            ).join(" · ")}{" "}
            · 총 {totalCount}건
          </p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">촬영 원가</p>
          <p className="mt-1 text-2xl font-bold">
            {totalCost.toLocaleString()}원
          </p>
          <p className="text-muted mt-1 text-xs">예약별로 입력한 원가 합계</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">고정비</p>
          <p className="mt-1 text-2xl font-bold">
            {totalFixedExpenses.toLocaleString()}원
          </p>
          <p className="text-muted mt-1 text-xs">
            임대료·장비·마케팅 등 {fixedExpenses.length}건
          </p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">순이익</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              netProfit < 0 ? "text-red-600 dark:text-red-400" : ""
            }`}
          >
            {netProfit.toLocaleString()}원
          </p>
          <p className="text-muted mt-1 text-xs">매출 − 원가 − 고정비</p>
        </div>
      </div>

      <div className="border-border bg-surface mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">건수</th>
              <th className="px-4 py-3 font-medium">매출액</th>
              <th className="px-4 py-3 font-medium">원가</th>
              <th className="px-4 py-3 font-medium">순이익</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted px-4 py-8 text-center">
                  이 달엔 집계할 예약이 없어요.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-border border-b last:border-0"
                >
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.count}건</td>
                  <td className="px-4 py-3">
                    {row.revenue.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3">{row.cost.toLocaleString()}원</td>
                  <td className="px-4 py-3 font-medium">
                    {(row.revenue - row.cost).toLocaleString()}원
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-border border-t font-bold">
                <td className="px-4 py-3">합계</td>
                <td className="px-4 py-3">{totalCount}건</td>
                <td className="px-4 py-3">{totalRevenue.toLocaleString()}원</td>
                <td className="px-4 py-3">{totalCost.toLocaleString()}원</td>
                <td className="px-4 py-3">
                  {(totalRevenue - totalCost).toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="border-border bg-surface mt-6 rounded-xl border p-4">
        <p className="font-medium">이 달의 고정비</p>
        <p className="text-muted mt-0.5 text-sm">
          촬영 건수와 무관하게 매달 나가는 지출이에요 (임대료, 장비 구매, 마케팅
          등).
        </p>

        {fixedExpenses.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {fixedExpenses.map((expense) => (
              <li
                key={expense.id}
                className="border-border flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
              >
                <span>{expense.label}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">
                    {expense.amount.toLocaleString()}원
                  </span>
                  <form action={deleteMonthlyExpense}>
                    <input type="hidden" name="id" value={expense.id} />
                    <PendingSubmit className="text-muted hover:text-foreground text-xs underline">
                      삭제
                    </PendingSubmit>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">
            아직 등록한 고정비가 없어요.
          </p>
        )}

        <form
          action={addMonthlyExpense}
          className="mt-4 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="month" value={month} />
          <label className="flex-1 basis-40">
            <span className="text-muted mb-1 block text-xs">항목</span>
            <input
              name="label"
              required
              maxLength={50}
              placeholder="예: 스튜디오 임대료"
              className={inputClass}
            />
          </label>
          <label className="w-32">
            <span className="text-muted mb-1 block text-xs">금액</span>
            <input
              name="amount"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              required
              className={inputClass}
            />
          </label>
          <SubmitButton variant="ghost">추가</SubmitButton>
        </form>
      </div>
    </div>
  );
}
