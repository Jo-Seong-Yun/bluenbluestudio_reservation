import type { Metadata } from "next";
import { loadProductAnalytics } from "@/lib/product-analytics";

export const metadata: Metadata = { title: "통계" };

const TREND_DAYS = 14;

export default async function AnalyticsPage() {
  const { rows, daily } = await loadProductAnalytics(TREND_DAYS);

  const sortedRows = [...rows].sort((a, b) => b.views - a.views);
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
  const totalApplications = rows.reduce((sum, r) => sum + r.applications, 0);
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.views, d.applications)));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">통계</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-xs">전체 조회수</p>
          <p className="mt-1 text-2xl font-bold">{totalViews.toLocaleString()}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-xs">전체 신청수</p>
          <p className="mt-1 text-2xl font-bold">{totalApplications.toLocaleString()}</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted text-xs">전체 전환율</p>
          <p className="mt-1 text-2xl font-bold">
            {totalViews > 0
              ? `${((totalApplications / totalViews) * 100).toFixed(1)}%`
              : "-"}
          </p>
        </div>
      </div>

      <section className="border-border bg-surface mt-6 rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">최근 {TREND_DAYS}일 동향</h2>
          <div className="text-muted flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-brand inline-block h-2 w-2 rounded-full" />
              조회
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              신청
            </span>
          </div>
        </div>

        <div className="flex h-32 items-end gap-1.5 overflow-x-auto">
          {daily.map((d) => (
            <div
              key={d.date}
              className="flex min-w-[2rem] flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-24 w-full items-end justify-center gap-0.5">
                <div
                  className="bg-brand w-2 rounded-t"
                  style={{ height: `${(d.views / maxDaily) * 100}%` }}
                  title={`${d.date} 조회 ${d.views}건`}
                />
                <div
                  className="w-2 rounded-t bg-emerald-500"
                  style={{ height: `${(d.applications / maxDaily) * 100}%` }}
                  title={`${d.date} 신청 ${d.applications}건`}
                />
              </div>
              <span className="text-muted text-[10px] whitespace-nowrap">
                {d.date.slice(5).replace("-", "/")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border bg-surface mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">조회수</th>
              <th className="px-4 py-3 font-medium">신청수</th>
              <th className="px-4 py-3 font-medium">전환율</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-8 text-center">
                  아직 쌓인 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.productId} className="border-border border-t">
                  <td className="px-4 py-3">{row.productName}</td>
                  <td className="px-4 py-3">{row.views.toLocaleString()}</td>
                  <td className="px-4 py-3">{row.applications.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {row.conversionRate === null
                      ? "-"
                      : `${row.conversionRate.toFixed(1)}%`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="text-muted mt-3 text-xs">
        조회수는 손님이 상품 상세 페이지를 열 때마다 기록됩니다(같은 사람이
        여러 번 봐도 각각 셉니다). 신청수는 실제로 접수된 예약 신청
        건수입니다.
      </p>
    </div>
  );
}
