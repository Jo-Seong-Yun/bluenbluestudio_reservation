"use client";
import { useState } from "react";
import { stageLabels, type FlowAnalytics } from "@/lib/analytics/summary";
const percent = (n: number | null) => (n === null ? "-" : `${n.toFixed(1)}%`);
export function FlowPanel({
  flow,
  names,
}: {
  flow: FlowAnalytics;
  names: Record<string, string>;
}) {
  const [version, setVersion] = useState("all");
  const versions = [
    ...new Set(flow.fields.map((f) => `${f.productId}:${f.version}`)),
  ];
  return (
    <section className="mb-6 space-y-5">
      <div className="border-border bg-surface rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-bold">개편 이후 예약 흐름</h2>
        <p className="text-muted mt-2 text-xs leading-relaxed">
          {flow.startedAt
            ? `새 이벤트 최초 수집: ${new Date(flow.startedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}. 마지막 통계 리셋 이후 기록을 집계합니다.`
            : "새 단계는 수집 전입니다. 고객 방문이 기록되면 세션 통계가 표시됩니다."}{" "}
          방문 세션은 같은 브라우저에서 30분 동안 활동이 이어지는 방문입니다.
          사람 수와는 다릅니다.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["방문 세션", flow.sessions.toLocaleString()],
            ["예약 시도", flow.attempts.toLocaleString()],
            ["접수 완료", flow.completions.toLocaleString()],
            ["신청서 완료율", percent(flow.formCompletionRate)],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface-subtle rounded-lg p-4">
              <p className="text-muted text-xs">{label}</p>
              <p className="text-brand mt-2 text-2xl font-bold">
                {flow.startedAt ? value : "수집 전"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {flow.stages.map((stage) => (
            <div
              key={stage.kind}
              className="border-border rounded-lg border p-3"
            >
              <p className="text-muted text-xs">{stageLabels[stage.kind]}</p>
              <p className="mt-2 text-xl font-bold">
                {flow.startedAt ? stage.sessions : "수집 전"}
              </p>
              <p className="text-muted mt-1 text-xs">
                {flow.startedAt
                  ? `${stage.count}회 · 세션 기준`
                  : "기록하지 않았던 단계"}
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted mt-3 text-xs leading-relaxed">
          상품·시간 선택·신청서로 바로 들어온 세션 {flow.directProductSessions}
          건은 목록 단계를 거치지 않을 수 있습니다. 신청서 완료율은 동일한 예약
          시도에서 신청서 진입 후 접수한 비율입니다. 관리자 수기 등록·로그인
          상태의 테스트는 새 고객 퍼널에서 제외합니다.
        </p>
      </div>
      <div className="border-border bg-surface rounded-xl border p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-bold">문항별 작성 분석</h2>
          <label className="min-w-0 text-xs">
            <span className="sr-only">상품과 신청서 버전</span>
            <select
              aria-label="상품과 신청서 버전"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border-border bg-surface max-w-full rounded-lg border p-2"
            >
              <option value="all">전체 상품·버전</option>
              {versions.map((v) => {
                const sample = flow.fields.find(
                  (f) => `${f.productId}:${f.version}` === v,
                )!;
                return (
                  <option key={v} value={v}>
                    {names[sample.productId ?? ""] ?? "삭제된 상품"} ·{" "}
                    {sample.version ?? "버전 없음"}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <p className="text-muted mt-2 text-xs leading-relaxed">
          답변 내용은 저장하지 않습니다. 문항별 수치는 예약 시도 수이며, 유효
          답변은 마지막 기록 상태를 사용합니다. 마지막 도달은 접수 없이 30분
          이상 지난 시도의 마지막으로 진입한 문항입니다. 시간은 선택 문항에
          진입한 뒤 유효 답변까지의 경과 시간입니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="bg-surface-subtle text-muted text-xs">
              <tr>
                {[
                  "상품 / 버전 / 문항",
                  "문항 진입",
                  "유효 답변",
                  "검증 오류",
                  "마지막 도달",
                  "평균 작성",
                ].map((label) => (
                  <th className="p-3 text-left font-medium" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flow.fields
                .filter(
                  (f) =>
                    version === "all" ||
                    `${f.productId}:${f.version}` === version,
                )
                .map((f) => (
                  <tr className="border-border border-b" key={f.key}>
                    <td className="p-3">
                      <p className="text-muted text-xs">
                        {names[f.productId ?? ""] ?? "삭제된 상품"} ·{" "}
                        {f.version}
                      </p>
                      <p className="mt-1 font-medium">{f.label}</p>
                    </td>
                    <td className="p-3">{f.views}</td>
                    <td className="p-3">{f.valid}</td>
                    <td className="p-3">{f.errors}</td>
                    <td className="p-3">{f.lastReached}</td>
                    <td className="p-3">
                      {f.averageMs === null
                        ? "-"
                        : `${Math.round(f.averageMs / 1000)}초`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!flow.fields.length ? (
            <p className="text-muted py-6 text-center text-sm">
              {flow.startedAt
                ? "아직 문항 진행 기록이 없습니다."
                : "문항 분석은 수집 전입니다."}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            title: "유입경로별 세션 전환",
            rows: flow.channels.map((r) => ({ ...r, label: r.channel })),
          },
          {
            title: "모바일·데스크톱 세션 전환",
            rows: flow.devices.map((r) => ({
              ...r,
              label: r.device === "mobile" ? "모바일" : "데스크톱",
            })),
          },
        ].map((group) => (
          <div
            key={group.title}
            className="border-border bg-surface min-w-0 rounded-xl border p-4"
          >
            <h2 className="font-bold">{group.title}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted">
                  <tr>
                    {["분류", "세션", "접수 세션", "전환율"].map((l) => (
                      <th key={l} className="px-2 py-2 text-left font-medium">
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r) => (
                    <tr key={r.label} className="border-border border-t">
                      <td className="max-w-36 px-2 py-3 break-words">
                        {r.label}
                      </td>
                      <td className="px-2">{r.sessions}</td>
                      <td className="px-2">{r.completions}</td>
                      <td className="px-2">{percent(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!group.rows.length ? (
                <p className="text-muted py-4">
                  {flow.startedAt ? "기록 없음" : "수집 전"}
                </p>
              ) : null}
            </div>
            <p className="text-muted mt-3 text-xs">
              세션의 최초 기록에 남은 유입경로와 기기로 분류합니다. 과거 조회
              횟수는 분모에 넣지 않습니다.
            </p>
          </div>
        ))}
      </div>
      <div className="border-border bg-surface rounded-xl border p-4">
        <h2 className="font-bold">최종 제출 실패</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {flow.failures.map((f) => (
            <p className="text-sm" key={f.code}>
              {
                {
                  validation: "입력 검증",
                  availability: "예약 시간 변경",
                  server: "서버 오류",
                }[f.code as "validation" | "availability" | "server"]
              }
              :{" "}
              {flow.startedAt
                ? `${f.attempts}개 시도 · ${f.count}회`
                : "수집 전"}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
