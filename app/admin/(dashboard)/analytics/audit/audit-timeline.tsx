"use client";
import { useState, useTransition } from "react";
import { fetchAuditActivity } from "@/app/admin/analytics-activity-actions";
import {
  actorLabels,
  operationLabels,
  sourceLabels,
  type AuditPage,
  type AuditFilter,
} from "@/lib/analytics/audit";
import { eventLabels } from "@/lib/analytics/shared";
import { kstDateString, kstTimeString } from "@/lib/time";
export function AuditTimeline({ initial }: { initial: AuditPage }) {
  const [page, setPage] = useState(initial),
    [filter, setFilter] = useState<AuditFilter>({}),
    [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function load(next: AuditFilter, append = false) {
    setError("");
    startTransition(async () => {
      try {
        const result = await fetchAuditActivity(next);
        setPage((old) => ({
          ...result,
          rows: append
            ? [
                ...old.rows,
                ...result.rows.filter(
                  (row) => !old.rows.some((r) => r.id === row.id),
                ),
              ]
            : result.rows,
        }));
        setFilter({ ...next, cursor: undefined });
      } catch {
        setError(
          "보존 이력을 불러오지 못했습니다. 입력 조건을 확인해 주십시오.",
        );
      }
    });
  }
  return (
    <section className="bg-surface border-border mt-4 rounded-xl border p-4">
      <h1 className="text-xl font-bold">전체 보존 이력</h1>
      <p className="text-muted mt-2 text-sm">
        예약·상품·원본 로그를 삭제하거나 통계를 초기화해도 남습니다. 관리자
        테스트는 고객 전환율에 포함하지 않고 이곳에 보관합니다. 이력은
        수정·삭제할 수 없습니다.
      </p>
      <p className="text-muted mt-2 text-xs">
        시각은 한국 시간(KST)입니다. 기존 이관 기록의 작업자는 확인할 수
        없습니다. 변경된 항목과 상태·금액·ID를 보관하며 이름·연락처·답변·메모
        원문은 복제하지 않습니다.
      </p>
      <form
        className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          load(
            Object.fromEntries(
              [...data]
                .filter(([, v]) => String(v).trim())
                .map(([k, v]) => [k, String(v).trim()]),
            ) as AuditFilter,
          );
        }}
      >
        {(
          [
            ["from", "시작 시각 (KST)"],
            ["to", "종료 시각 (KST)"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              type="datetime-local"
              name={name}
              className="border-border block w-full rounded border p-2"
            />
          </label>
        ))}
        <label className="text-sm">
          작업자
          <select
            name="actor"
            className="border-border block w-full rounded border p-2"
          >
            <option value="">전체</option>
            {Object.entries(actorLabels).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          대상
          <select
            name="source"
            className="border-border block w-full rounded border p-2"
          >
            <option value="">전체</option>
            {Object.entries(sourceLabels).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          작업
          <select
            name="operation"
            className="border-border block w-full rounded border p-2"
          >
            <option value="">전체</option>
            {Object.entries(operationLabels).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            ["ref", "유입 태그"],
            ["sourceId", "대상 ID"],
            ["sessionId", "방문 세션 UUID"],
            ["productId", "상품 UUID"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              name={name}
              className="border-border block w-full rounded border p-2"
            />
          </label>
        ))}
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
      <p className="text-muted text-xs">
        현재 조회 {page.rows.length.toLocaleString()}건 · 100건씩 이어 보기
      </p>
      <div className="mt-3 max-h-[700px] overflow-auto">
        {!page.rows.length ? (
          <p className="p-3">조건에 맞는 이력이 없습니다.</p>
        ) : null}
        {page.rows.map((row, index) => {
          const date = new Date(row.occurred_at),
            hour = `${kstDateString(date)} ${kstTimeString(date).slice(0, 2)}시`;
          const prev = index
            ? new Date(page.rows[index - 1].occurred_at)
            : null;
          const previous = prev
            ? `${kstDateString(prev)} ${kstTimeString(prev).slice(0, 2)}시`
            : null;
          const visibility = (
            row.details as { event?: { visibility?: string } } | null
          )?.event?.visibility;
          const event = row.event_kind
            ? (eventLabels[row.event_kind] ?? row.event_kind)
            : null;
          return (
            <div key={row.id}>
              {hour !== previous ? (
                <h2 className="bg-surface-subtle sticky top-0 p-2 text-sm font-bold">
                  {hour}
                </h2>
              ) : null}
              <details className="border-border border-b p-3 text-sm">
                <summary className="cursor-pointer leading-6 break-words">
                  <time className="text-muted mr-2 font-mono text-xs">
                    {kstTimeString(date)}.
                    {String(date.getMilliseconds()).padStart(3, "0")}
                  </time>
                  <span className="mr-2">{actorLabels[row.actor_type]}</span>
                  <b>
                    {sourceLabels[row.source_table] ?? row.source_table} ·{" "}
                    {operationLabels[
                      row.operation as keyof typeof operationLabels
                    ] ?? row.operation}
                    {event ? ` · ${event}` : ""}
                    {row.event_kind === "visibility_change" &&
                    ["hidden", "visible"].includes(visibility ?? "")
                      ? ` (${visibility})`
                      : ""}
                  </b>
                  {row.ref ? <span className="ml-2">{row.ref}</span> : null}
                </summary>
                <dl className="my-3 grid gap-2 text-xs break-all sm:grid-cols-2">
                  {Object.entries({
                    "대상 ID": row.source_id,
                    "관리자 ID": row.actor_id,
                    세션: row.session_id,
                    "예약 시도": row.attempt_id,
                    "상품 ID": row.product_id,
                    기기: row.device,
                    "보존 시각 (KST)": `${kstDateString(new Date(row.recorded_at))} ${kstTimeString(new Date(row.recorded_at))}`,
                  }).map(([label, value]) =>
                    value ? (
                      <div key={label}>
                        <dt className="text-muted">{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
                {(
                  [
                    ["변경 전", row.before_data],
                    ["변경 후 / 이관 상태", row.after_data],
                    ["세부 정보", row.details],
                  ] as const
                ).map(([label, value]) =>
                  value ? (
                    <div className="mt-2" key={label}>
                      <h3 className="text-xs font-bold">{label}</h3>
                      <pre className="bg-surface-subtle mt-1 rounded p-2 text-xs break-all whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ) : null,
                )}
              </details>
            </div>
          );
        })}
      </div>
      {page.cursor ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            load({ ...filter, cursor: page.cursor ?? undefined }, true)
          }
          className="border-border mt-4 rounded border px-4 py-2 disabled:opacity-40"
        >
          {pending ? "불러오는 중…" : "이전 이력 더 보기"}
        </button>
      ) : null}
    </section>
  );
}
