import type { Metadata } from "next";
import {
  loadProductAnalytics,
  type ActivityLogEntry,
} from "@/lib/product-analytics";
import { kstDateString, kstTimeString } from "@/lib/time";
import { ResetAnalyticsButton } from "./reset-analytics-button";
import { ActivityMemo } from "./activity-memo";

export const metadata: Metadata = { title: "통계" };

const TREND_DAYS = 14;

const ACTIVITY_KIND_LABEL: Record<ActivityLogEntry["kind"], string> = {
  list_view: "상품 목록 진입",
  product_view: "상품 상세 진입",
  apply_view: "신청서 진입",
  reservation: "실제 예약",
  reset: "통계 리셋",
};

const ACTIVITY_KIND_DOT: Record<ActivityLogEntry["kind"], string> = {
  list_view: "bg-muted",
  product_view: "bg-brand",
  apply_view: "bg-sky-500",
  reservation: "bg-emerald-500",
  reset: "bg-amber-500",
};

export default async function AnalyticsPage() {
  const { rows, daily, hourly, listViews, applyViews, channelBreakdown, recentActivity } =
    await loadProductAnalytics(TREND_DAYS);

  const sortedRows = [...rows].sort((a, b) => b.views - a.views);
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
  const totalApplications = rows.reduce((sum, r) => sum + r.applications, 0);
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.views, d.applications)));
  const maxHourly = Math.max(1, ...hourly.map((h) => h.views));

  const listToDetailRate = listViews > 0 ? (totalViews / listViews) * 100 : null;
  const detailToApplyRate = totalViews > 0 ? (applyViews / totalViews) * 100 : null;
  const applyToApplicationRate =
    applyViews > 0 ? (totalApplications / applyViews) * 100 : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">통계</h1>
        <ResetAnalyticsButton />
      </div>

      {/* 상품 목록 진입 → 상품 상세(설명) 진입 → 신청서 진입 → 실제 예약,
          4단계 유입 퍼널. "상품 상세 → 신청서" 구간 이탈은 날짜·시간
          선택 단계에서 빠져나간 것이고, "신청서 → 실제 예약" 구간 이탈은
          신청서 작성 중 빠져나간 것이라 구분해서 볼 수 있다. 목록·신청서
          진입은 특정 상품에 딸린 숫자가 아니라 사이트 전체 기준이라
          상품별 표에는 안 넣고 여기 요약에서만 보여준다. */}
      <div className="border-border bg-surface flex flex-wrap items-stretch gap-3 rounded-xl border p-4 sm:flex-nowrap">
        <FunnelStep label="상품 목록 진입" value={listViews} />
        <FunnelArrow rate={listToDetailRate} />
        <FunnelStep label="상품 상세 진입" value={totalViews} />
        <FunnelArrow rate={detailToApplyRate} />
        <FunnelStep label="신청서 진입" value={applyViews} />
        <FunnelArrow rate={applyToApplicationRate} />
        <FunnelStep label="실제 예약" value={totalApplications} highlight />
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

      <section className="border-border bg-surface mt-6 rounded-xl border p-4">
        <h2 className="mb-4 font-bold">시간대별 접속자 수 (KST)</h2>
        <div className="flex h-32 items-end gap-px overflow-x-auto">
          {hourly.map((h) => (
            <div
              key={h.hour}
              className="flex min-w-[calc((100%-23px)/24)] flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="bg-brand w-full rounded-t opacity-80"
                  style={{ height: `${(h.views / maxHourly) * 100}%`, minHeight: h.views > 0 ? "2px" : undefined }}
                  title={`${h.hour}시 ${h.views}건`}
                />
              </div>
              <span className="text-muted text-[9px]">
                {h.hour % 3 === 0 ? `${h.hour}시` : ""}
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

      {/* 손님이 들어온 링크의 ?ref=값(유입경로)별 조회·신청 집계 —
          인스타그램, 공지 링크 등 병렬로 돌리는 채널을 서로 비교하려는
          목적. 링크에 ref가 없던 방문은 "(직접 방문)"으로 묶인다. */}
      <section className="border-border bg-surface mt-6 overflow-x-auto rounded-xl border">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-bold">유입경로별 집계</h2>
          <p className="text-muted mt-0.5 text-xs">
            홍보 링크 끝에 ?ref=값을 붙이면(예: ?ref=insta) 그 채널로 들어온
            조회·신청이 여기 따로 집계됩니다.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">유입경로</th>
              <th className="px-4 py-3 font-medium">조회수</th>
              <th className="px-4 py-3 font-medium">신청수</th>
              <th className="px-4 py-3 font-medium">전환율</th>
            </tr>
          </thead>
          <tbody>
            {channelBreakdown.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-8 text-center">
                  아직 쌓인 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              channelBreakdown.map((row) => (
                <tr key={row.channel} className="border-border border-t">
                  <td className="px-4 py-3">{row.channel}</td>
                  <td className="px-4 py-3">{row.views.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {row.applications.toLocaleString()}
                  </td>
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

      {/* 집계된 숫자 말고 "언제" 발생했는지 하나하나 보고 싶을 때 쓰는
          상세 로그. 세 종류(목록 진입/상품 상세 진입/실제 예약)를 발생
          시간순으로 섞어서 최근 것부터 보여준다. 화면 밖으로 무한정
          늘어나지 않게 목록 자체를 스크롤 영역으로 둔다. */}
      <section className="border-border bg-surface mt-6 rounded-xl border p-4">
        <h2 className="mb-4 font-bold">상세 로그</h2>

        {recentActivity.length === 0 ? (
          <p className="text-muted py-4 text-center text-sm">
            아직 쌓인 기록이 없습니다.
          </p>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto">
            {recentActivity.map((entry) => (
              <li
                key={`${entry.kind}-${entry.id}`}
                className="border-border flex items-center gap-3 border-b py-2 text-sm last:border-0"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${ACTIVITY_KIND_DOT[entry.kind]}`}
                  aria-hidden
                />
                <span className="text-muted w-36 shrink-0 font-mono text-xs">
                  {kstDateString(new Date(entry.occurredAt))}{" "}
                  {kstTimeString(new Date(entry.occurredAt))}
                </span>
                <span className="w-28 shrink-0">
                  {ACTIVITY_KIND_LABEL[entry.kind]}
                </span>
                <span className="text-muted min-w-0 flex-1 truncate">
                  {entry.productName ?? "-"}
                </span>
                <span className="w-20 shrink-0 truncate text-xs" title={entry.ref ?? undefined}>
                  {entry.ref ? (
                    <span className="bg-surface-subtle text-muted rounded px-1.5 py-0.5">
                      {entry.ref}
                    </span>
                  ) : (
                    <span className="text-muted-faint">-</span>
                  )}
                </span>
                {entry.kind === "reset" ? null : (
                  <ActivityMemo
                    kind={entry.kind}
                    id={entry.id}
                    memo={entry.memo}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-muted mt-3 text-xs">
        상품 목록 진입은 예약하기 첫 화면(상품을 고르는 화면)을 열 때마다,
        상품 상세 진입(조회수)은 손님이 상품 상세 페이지를 열 때마다, 신청서
        진입은 날짜·시간을 고르고 신청서 작성 화면까지 들어올 때마다
        기록됩니다(같은 사람이 여러 번 봐도 각각 셉니다). 실제 예약(신청수)은
        실제로 접수된 예약 신청 건수입니다. 성윤님이 로그인한 채로 손님
        화면을 둘러보신 경우는 통계에 섞이지 않습니다. 상세 로그는 최근
        발생한 순으로 최대 100건까지 보여줍니다. &quot;통계 리셋&quot;을
        누르면 위 숫자들은 그 시점부터 다시 집계되지만, 조회 기록 자체는
        지워지지 않아 상세 로그에서는 리셋 이전 기록도 계속 보입니다. 상품
        이름 오른쪽의 회색 칸은 그 기록에 붙어 있던 유입경로(?ref=값)이고,
        없으면 -로 표시됩니다. 그 옆 &quot;메모&quot;를 누르면 그 기록에
        메모를 남길 수 있습니다(예약 줄의 메모는 예약 상세의 &quot;사장님
        메모&quot;와 같은 내용입니다).
      </p>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1 text-center">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={`text-2xl font-bold ${highlight ? "text-brand" : ""}`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function FunnelArrow({ rate }: { rate: number | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <span className="text-muted" aria-hidden>
        →
      </span>
      <span className="text-muted text-[11px] whitespace-nowrap">
        {rate === null ? "-" : `${rate.toFixed(1)}%`}
      </span>
    </div>
  );
}
