"use client";
import { useState, useTransition } from "react";
import { fetchAnalyticsActivity } from "@/app/admin/analytics-activity-actions";
import type { ActivityFilter, ActivityPage } from "@/lib/analytics/activity";
import { eventLabels } from "@/lib/analytics/shared";
import { kstDateString, kstTimeString } from "@/lib/time";
import { ActivityMemo } from "./activity-memo";
import { ActivityDeleteButton } from "./activity-delete-button";
export function ActivityTimeline({
  initial,
  names,
}: {
  initial: ActivityPage;
  names: Record<string, string>;
}) {
  const [page, setPage] = useState(initial);
  const [filter, setFilter] = useState<ActivityFilter>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function load(next: ActivityFilter, append = false) {
    setError("");
    startTransition(async () => {
      try {
        const result = await fetchAnalyticsActivity(next);
        setPage((old) => ({
          ...result,
          rows: append
            ? [
                ...old.rows,
                ...result.rows.filter(
                  (row) => !old.rows.some((e) => e.id === row.id),
                ),
              ]
            : result.rows,
        }));
        setFilter({ ...next, cursor: undefined });
      } catch {
        setError(
          "로그를 불러오지 못했습니다. 기간과 ID를 확인한 뒤 다시 시도해 주십시오.",
        );
      }
    });
  }
  return (
    <section className="border-border bg-surface mt-6 rounded-xl border p-4">
      <h2 className="font-bold">시간순 상세 행동 로그</h2>
      <p className="text-muted mt-2 text-xs">
        KST 기준 발생 시각(밀리초) 순입니다. 100건씩 이어 보며, 펼치면
        문항·선택지·페이지·세션·수신 시각을 확인합니다. 답변 원문은 수집하지
        않습니다.
      </p>
      <form
        className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const values = Object.fromEntries(
            [...data]
              .filter(([, value]) => String(value).trim())
              .map(([key, value]) => [key, String(value).trim()]),
          );
          load(values as ActivityFilter);
        }}
      >
        <label className="text-xs">
          시작 시각 (KST)
          <input
            className="border-border block w-full rounded border p-2"
            type="datetime-local"
            name="from"
          />
        </label>
        <label className="text-xs">
          종료 시각 (KST)
          <input
            className="border-border block w-full rounded border p-2"
            type="datetime-local"
            name="to"
          />
        </label>
        <label className="text-xs">
          행동
          <select
            className="border-border block w-full rounded border p-2"
            name="kind"
          >
            <option value="">전체 행동</option>
            {Object.entries(eventLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          상품
          <select
            className="border-border block w-full rounded border p-2"
            name="productId"
          >
            <option value="">전체 상품</option>
            {Object.entries(names).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          방문 세션 ID
          <input
            className="border-border block w-full rounded border p-2"
            name="sessionId"
            placeholder="전체 UUID"
          />
        </label>
        <label className="text-xs">
          예약 시도 ID
          <input
            className="border-border block w-full rounded border p-2"
            name="attemptId"
            placeholder="전체 UUID"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand rounded p-2 text-white disabled:opacity-40"
        >
          {pending ? "조회 중…" : "조회 / 새로고침"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <p className="text-muted mb-3 text-xs">
        현재 불러온 기록 {page.rows.length.toLocaleString()}건 · 시간별 묶음은
        현재 조회 결과 기준입니다.
      </p>
      <div className="max-h-[650px] overflow-y-auto">
        {!page.rows.length ? (
          <p className="p-4 text-sm">조건에 맞는 기록이 없습니다.</p>
        ) : null}
        {page.rows.map((row, index) => {
          const date = new Date(row.occurred_at);
          const hour = `${kstDateString(date)} ${kstTimeString(date).slice(0, 2)}시`;
          const previous =
            index > 0 ? new Date(page.rows[index - 1].occurred_at) : null;
          const previousHour = previous
            ? `${kstDateString(previous)} ${kstTimeString(previous).slice(0, 2)}시`
            : null;
          const heading = previousHour === hour ? null : hour;
          const stamp = `${kstDateString(date)} ${kstTimeString(date)}:${String(date.getUTCSeconds()).padStart(2, "0")}.${String(date.getUTCMilliseconds()).padStart(3, "0")}`;
          return (
            <div key={row.id}>
              {heading ? (
                <h3 className="bg-surface-subtle mt-4 rounded p-2 text-sm font-bold">
                  {heading}
                </h3>
              ) : null}
              <details className="border-border border-b py-3 text-sm">
                <summary className="cursor-pointer">
                  <time
                    className="text-muted mr-3 font-mono text-xs"
                    dateTime={row.occurred_at}
                  >
                    {stamp}
                  </time>
                  <b>
                    {eventLabels[row.event_kind] ?? row.event_kind}
                    {row.event_kind === "visibility_change" &&
                    ["hidden", "visible"].includes(
                      String(row.event_details?.visibility),
                    )
                      ? ` (${row.event_details?.visibility})`
                      : ""}
                  </b>
                  <span className="ml-3">
                    {names[row.product_id ?? ""] ?? "공통 / 삭제된 상품"}
                    {row.field_label ? ` · ${row.field_label}` : ""}
                  </span>
                </summary>
                <dl className="bg-surface-subtle mt-3 grid gap-2 rounded p-3 text-xs break-all">
                  <div>
                    <dt>세션 ID / 예약 시도 ID</dt>
                    <dd>
                      {row.session_id} / {row.attempt_id ?? "없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>기기 / 유입 / 신청서 버전</dt>
                    <dd>
                      {row.device} / {row.ref ?? "직접 방문"} /{" "}
                      {row.form_version ?? "없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>문항 ID / 기본 문항 순서</dt>
                    <dd>
                      {row.field_id ?? "없음"} / {row.field_order ?? "없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>행동 상세</dt>
                    <dd>
                      {Object.entries(row.event_details ?? {}).map(
                        ([key, value]) => (
                          <span key={key} className="mr-3 inline-block">
                            {(
                              {
                                pageId: "페이지 ID",
                                fromPage: "이전 페이지 ID",
                                toPage: "이동 페이지 ID",
                                optionIndex: "선택지 인덱스(0부터)",
                                optionLabel: "선택지",
                                selectedCount: "선택 개수",
                                date: "선택 날짜",
                                time: "선택 시간",
                                visibility: "화면 상태",
                              } as Record<string, string>
                            )[key] ?? key}
                            : {String(value)}
                          </span>
                        ),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>체류 시간 / 오류</dt>
                    <dd>
                      {row.duration_ms === null
                        ? "없음"
                        : `${row.duration_ms}ms`}{" "}
                      / {row.error_code ?? "없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>서버 수신 시각</dt>
                    <dd>
                      {new Date(row.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        hour12: false,
                      })}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-4">
                  <ActivityMemo
                    kind="booking_event"
                    id={row.id}
                    memo={row.memo}
                  />
                  <ActivityDeleteButton
                    kind="booking_event"
                    id={row.id}
                    onDeleted={() =>
                      setPage((old) => ({
                        ...old,
                        rows: old.rows.filter((e) => e.id !== row.id),
                      }))
                    }
                  />
                </div>
              </details>
            </div>
          );
        })}
      </div>
      {page.cursor ? (
        <button
          disabled={pending}
          onClick={() => load({ ...filter, cursor: page.cursor! }, true)}
          className="border-border mt-4 rounded border p-2 text-sm disabled:opacity-40"
        >
          이전 기록 100건 더 보기
        </button>
      ) : (
        <p className="text-muted mt-3 text-xs">
          현재 조건의 마지막 기록까지 표시했습니다.
        </p>
      )}
    </section>
  );
}
