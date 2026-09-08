import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addMonths, kstMonthString } from "@/lib/time";
import type { ReservationStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "매출 관리" };

/**
 * 매출로 치는 예약 상태.
 *
 * "신청만 됨"(requested)은 입금 전이라 빼고, "취소"(cancelled)도 뺀다.
 * "노쇼"(no_show)는 넣는다 — 예약금을 돌려주지 않으니 매출로 잡는 게 맞다.
 * 상품 가격이 나중에 바뀌어도 지난달 매출이 흔들리지 않게 하려면
 * 예약 시점 가격을 reservations에 따로 저장해야 하는데, 지금은 그렇게
 * 하지 않고 상품의 현재 가격으로 계산한다 — 가격을 자주 바꾸는 곳이
 * 아니라 당장은 이 정도로 충분하다.
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

  const [{ data: reservations }, { data: products }] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, status, product_id")
      .gte("shoot_start", `${month}-01T00:00:00+09:00`)
      .lt("shoot_start", `${nextMonth}-01T00:00:00+09:00`)
      .in("status", REVENUE_STATUSES),
    supabase.from("products").select("id, name, price").order("sort_order"),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const byProduct = new Map<
    string,
    { name: string; price: number; count: number; revenue: number }
  >();
  const byStatus: Partial<Record<ReservationStatus, number>> = {};

  for (const r of reservations ?? []) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    const product = productById.get(r.product_id);
    const price = product?.price ?? 0;
    const entry = byProduct.get(r.product_id) ?? {
      name: product?.name ?? "(삭제된 상품)",
      price,
      count: 0,
      revenue: 0,
    };
    entry.count += 1;
    entry.revenue += price;
    byProduct.set(r.product_id, entry);
  }

  const rows = [...byProduct.entries()]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCount = reservations?.length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">매출 관리</h1>
      <p className="text-muted mt-1 text-sm">
        확정·완료·노쇼 처리된 예약을 상품 가격 기준으로 집계해요. 취소된 예약과
        입금 전 신청은 빠져 있어요.
      </p>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">이번 달 매출</p>
          <p className="mt-1 text-2xl font-bold">
            {totalRevenue.toLocaleString()}원
          </p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">집계된 예약</p>
          <p className="mt-1 text-2xl font-bold">{totalCount}건</p>
          <p className="text-muted mt-1 text-xs">
            {REVENUE_STATUSES.map(
              (status) => `${STATUS_LABELS[status]} ${byStatus[status] ?? 0}건`,
            ).join(" · ")}
          </p>
        </div>
      </div>

      <div className="border-border bg-surface mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">단가</th>
              <th className="px-4 py-3 font-medium">건수</th>
              <th className="px-4 py-3 font-medium">매출액</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-8 text-center">
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
                  <td className="px-4 py-3">{row.price.toLocaleString()}원</td>
                  <td className="px-4 py-3">{row.count}건</td>
                  <td className="px-4 py-3 font-medium">
                    {row.revenue.toLocaleString()}원
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-border border-t font-bold">
                <td className="px-4 py-3" colSpan={2}>
                  합계
                </td>
                <td className="px-4 py-3">{totalCount}건</td>
                <td className="px-4 py-3">{totalRevenue.toLocaleString()}원</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
