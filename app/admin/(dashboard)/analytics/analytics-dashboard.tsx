import { FlowPanel } from "./flow-panel";

import {
  type ProductAnalytics,
  type ActivityLogEntry,
} from "@/lib/product-analytics";
import { kstDateString, kstTimeString } from "@/lib/time";
import { ResetAnalyticsButton } from "./reset-analytics-button";
import { ActivityMemo } from "./activity-memo";
import { ActivityDeleteButton } from "./activity-delete-button";
import { AnalyticsLastSeenTracker } from "./last-seen-tracker";

const TREND_DAYS = 14;

const ACTIVITY_KIND_LABEL: Record<ActivityLogEntry["kind"], string> = {
  list_view: "상품 목록 진입",
  product_view: "상세·시간(기존)",
  apply_view: "신청서 진입",
  reservation: "실제 예약",
  reset: "통계 리셋",
  booking_event: "예약 진행",
};

const ACTIVITY_KIND_DOT: Record<ActivityLogEntry["kind"], string> = {
  list_view: "bg-muted",
  product_view: "bg-brand",
  apply_view: "bg-sky-500",
  reservation: "bg-emerald-500",
  reset: "bg-amber-500",
  booking_event: "bg-sky-500",
};

export function AnalyticsDashboard({
  data,
  recordVisit = true,
}: {
  data: ProductAnalytics;
  recordVisit?: boolean;
}) {
  const {
    flow,
    legacyCounts,
    rows,
    daily,
    hourly,
    listViews,
    applyViews,
    channelBreakdown,
    recentActivity,
    lastSeenAt,
    previous,
  } = data;

  const sortedRows = [...rows].sort((a, b) => b.views - a.views);
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
  const totalApplications = rows.reduce((sum, r) => sum + r.applications, 0);
  const maxDaily = Math.max(
    1,
    ...daily.map((d) => Math.max(d.views, d.applications)),
  );
  const maxHourly = Math.max(1, ...hourly.map((h) => h.views));

  const listToDetailRate =
    listViews > 0 ? (totalViews / listViews) * 100 : null;
  const detailToApplyRate =
    totalViews > 0 ? (applyViews / totalViews) * 100 : null;
  const applyToApplicationRate =
    applyViews > 0 ? (totalApplications / applyViews) * 100 : null;

  // 지난번 확인(previous) 시점 대비 변동치 계산용 — previous가 null이면
  // (한 번도 연 적 없으면) 전부 null로 두어 아무 변동치도 안 보여준다.
  const previousTotalViews = previous
    ? previous.rows.reduce((sum, r) => sum + r.views, 0)
    : null;
  const previousTotalApplications = previous
    ? previous.rows.reduce((sum, r) => sum + r.applications, 0)
    : null;
  const previousRowByProductId = previous
    ? new Map(previous.rows.map((r) => [r.productId, r]))
    : null;
  const previousChannelByChannel = previous
    ? new Map(previous.channelBreakdown.map((r) => [r.channel, r]))
    : null;

  return (
    <div>
      {recordVisit ? <AnalyticsLastSeenTracker /> : null}

      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">통계</h1>
        <ResetAnalyticsButton />
      </div>
      {lastSeenAt ? (
        <p className="text-muted mb-5 text-xs">
          지난번 확인({kstDateString(new Date(lastSeenAt))}{" "}
          {kstTimeString(new Date(lastSeenAt))}) 이후 변동된 값은{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            빨간색
          </span>
          으로 표시됩니다.
        </p>
      ) : (
        <div className="mb-6" />
      )}

      <FlowPanel
        flow={flow}
        names={Object.fromEntries(
          rows.map((r) => [r.productId, r.productName]),
        )}
      />
      <section className="border-border bg-surface mb-5 rounded-xl border p-4">
        <h2 className="font-bold">과거 기록과 연결한 누적 집계</h2>
        <p className="text-muted mt-2 text-xs leading-relaxed">
          과거 목록 {legacyCounts.list}회 · 상세·시간 선택 {legacyCounts.detail}
          회 · 신청서 {legacyCounts.form}회 · 예약 {legacyCounts.reservations}
          건을 원본에서 연결합니다. 새 이벤트를 기존 테이블에 복사하지 않아 중복
          집계하지 않습니다. 과거 예약 {flow.unclassifiedReservations}건은 고객
          신청·관리자 등록을 구분할 근거가 없어 포함 출처 미분류로 유지합니다.
        </p>
        <p className="text-muted mt-2 text-xs">
          아래 조회 대비 접수 비율은 횟수 기준 참고 지표이며 세션 전환율과
          다릅니다. 상세·시간 선택은 과거에 함께 기록되어 분리할 수 없습니다.
        </p>
      </section>
      <div className="border-border bg-surface flex flex-wrap items-stretch gap-3 rounded-xl border p-4 sm:flex-nowrap">
        <FunnelStep
          label="상품 목록 진입"
          value={listViews}
          previous={previous?.listViews ?? null}
        />
        <FunnelArrow rate={listToDetailRate} />
        <FunnelStep
          label="상세·시간 선택 조회"
          value={totalViews}
          previous={previousTotalViews}
        />
        <FunnelArrow rate={detailToApplyRate} />
        <FunnelStep
          label="신청서 진입"
          value={applyViews}
          previous={previous?.applyViews ?? null}
        />
        <FunnelArrow rate={applyToApplicationRate} />
        <FunnelStep
          label="접수 기록 합계"
          value={totalApplications}
          previous={previousTotalApplications}
          highlight
        />
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
        <h2 className="mb-4 font-bold">시간대별 페이지 조회 (KST)</h2>
        {/* x축 기준선은 border-bottom으로 표시 — gap-px로 24칸 균등 분할 */}
        <div className="border-border flex h-24 items-end gap-px overflow-x-auto border-b">
          {hourly.map((h) => (
            <div
              key={h.hour}
              className="flex h-full min-w-[calc((100%-23px)/24)] flex-1 items-end justify-center"
            >
              <div
                className={`w-full rounded-t transition-opacity hover:opacity-100 ${h.views === 0 ? "bg-brand/20" : "bg-brand opacity-80"}`}
                style={{
                  height:
                    h.views === 0
                      ? "1px"
                      : `${Math.max(3, (h.views / maxHourly) * 100)}%`,
                }}
                title={`${h.hour}시 ${h.views}건`}
              />
            </div>
          ))}
        </div>
        {/* 레이블 행: 막대 행과 분리해 클리핑 없이 표시 */}
        <div className="mt-1 flex gap-px">
          {hourly.map((h) => (
            <span
              key={h.hour}
              className="text-muted min-w-0 flex-1 text-center text-[9px]"
            >
              {h.hour % 3 === 0 ? `${h.hour}시` : ""}
            </span>
          ))}
        </div>
      </section>

      <section className="border-border bg-surface mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">페이지 조회</th>
              <th className="px-4 py-3 font-medium">신청수</th>
              <th className="px-4 py-3 font-medium">조회 대비 접수</th>
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
              sortedRows.map((row) => {
                const prevRow =
                  previousRowByProductId?.get(row.productId) ?? null;
                return (
                  <tr key={row.productId} className="border-border border-t">
                    <td className="px-4 py-3">{row.productName}</td>
                    <td className="px-4 py-3">
                      {row.views.toLocaleString()}
                      <Delta
                        current={row.views}
                        previous={prevRow?.views ?? null}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.applications.toLocaleString()}
                      <Delta
                        current={row.applications}
                        previous={prevRow?.applications ?? null}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.conversionRate === null
                        ? "-"
                        : `${row.conversionRate.toFixed(1)}%`}
                      {row.conversionRate !== null &&
                      prevRow?.conversionRate != null ? (
                        <Delta
                          current={row.conversionRate}
                          previous={prevRow.conversionRate}
                          suffix="%p"
                          decimals={1}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })
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
              <th className="px-4 py-3 font-medium">페이지 조회</th>
              <th className="px-4 py-3 font-medium">신청수</th>
              <th className="px-4 py-3 font-medium">조회 대비 접수</th>
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
              channelBreakdown.map((row) => {
                const prevRow =
                  previousChannelByChannel?.get(row.channel) ?? null;
                return (
                  <tr key={row.channel} className="border-border border-t">
                    <td className="px-4 py-3">{row.channel}</td>
                    <td className="px-4 py-3">
                      {row.views.toLocaleString()}
                      <Delta
                        current={row.views}
                        previous={prevRow?.views ?? null}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.applications.toLocaleString()}
                      <Delta
                        current={row.applications}
                        previous={prevRow?.applications ?? null}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.conversionRate === null
                        ? "-"
                        : `${row.conversionRate.toFixed(1)}%`}
                      {row.conversionRate !== null &&
                      prevRow?.conversionRate != null ? (
                        <Delta
                          current={row.conversionRate}
                          previous={prevRow.conversionRate}
                          suffix="%p"
                          decimals={1}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })
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
                  {entry.eventLabel ?? ACTIVITY_KIND_LABEL[entry.kind]}
                </span>
                <span className="text-muted min-w-0 flex-1 truncate">
                  {entry.productName ?? "-"}
                </span>
                <span
                  className="w-20 shrink-0 truncate text-xs"
                  title={entry.ref ?? undefined}
                >
                  {entry.ref ? (
                    <span className="bg-surface-subtle text-muted rounded px-1.5 py-0.5">
                      {entry.ref}
                    </span>
                  ) : (
                    <span className="text-muted-faint">-</span>
                  )}
                </span>
                {entry.kind === "reset" ? null : (
                  <>
                    <ActivityMemo
                      kind={entry.kind}
                      id={entry.id}
                      memo={entry.memo}
                    />
                    <ActivityDeleteButton kind={entry.kind} id={entry.id} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-muted mt-3 text-xs">
        과거 조회는 화면을 열 때마다 세는 횟수이며 사람 수가 아닙니다. 새 세션
        분석은 개편 이후 수집한 기록만 사용합니다. 일별·시간대별 조회는
        목록·상세·시간 선택·신청서 화면 조회를 합산합니다. 통계 리셋은 집계 시작
        시점만 바꾸고 원본 로그는 보존합니다. 상세 로그는 최근 100건입니다.
        메모·삭제 기능은 기존과 동일합니다.
      </p>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  previous,
  highlight,
}: {
  label: string;
  value: number;
  /** 지난번 확인 시점의 값. null이면(비교 기준 없음) 변동치를 안 보여준다. */
  previous: number | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1 text-center">
      <p className="text-muted text-xs">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className={`text-2xl font-bold ${highlight ? "text-brand" : ""}`}>
          {value.toLocaleString()}
        </p>
        <Delta current={value} previous={previous} />
      </div>
    </div>
  );
}

/** 지난번 확인 값(previous) 대비 지금 값(current)의 변동치를 작은 빨간
 * 글씨로 보여준다. 비교 기준이 없거나(previous === null) 변동이 없으면
 * 아무것도 그리지 않는다. */
function Delta({
  current,
  previous,
  suffix = "",
  decimals = 0,
}: {
  current: number;
  previous: number | null;
  suffix?: string;
  decimals?: number;
}) {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.round(diff * 10 ** decimals) === 0) return null;
  const sign = diff > 0 ? "+" : "-";
  const magnitude = Math.abs(diff);
  const formatted =
    decimals > 0 ? magnitude.toFixed(decimals) : magnitude.toLocaleString();
  return (
    <span className="ml-1 text-[11px] font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
      {sign}
      {formatted}
      {suffix}
    </span>
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
