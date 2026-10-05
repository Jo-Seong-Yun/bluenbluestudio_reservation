import { describe, it, expect } from "vitest";
import { summarizeFlow } from "./summary";
import type { BookingEventRow } from "@/lib/supabase/database.types";
const t = "2026-10-05T01:00:00.000Z";
function e(
  kind: string,
  patch: Partial<BookingEventRow> = {},
): BookingEventRow {
  return {
    id: crypto.randomUUID(),
    session_id: "s",
    attempt_id: "a",
    product_id: "p",
    reservation_id: null,
    event_kind: kind,
    ref: "insta",
    device: "mobile",
    form_version: "00000001",
    field_id: null,
    field_label: null,
    field_order: null,
    duration_ms: null,
    error_code: null,
    memo: null,
    occurred_at: t,
    created_at: t,
    ...patch,
  };
}
describe("새 예약 흐름 집계", () => {
  it("동일 세션의 반복 조회를 세션 전환율 분모에 중복 넣지 않는다", () => {
    const data = summarizeFlow(
      [
        e("list_view"),
        e("detail_view"),
        e("detail_view"),
        e("form_view"),
        e("completed", { reservation_id: "r" }),
      ],
      t,
      5,
    );
    expect(data.sessions).toBe(1);
    expect(data.channels[0]).toMatchObject({
      sessions: 1,
      completions: 1,
      rate: 100,
    });
    expect(data.formCompletionRate).toBe(100);
    expect(data.stages.find((s) => s.kind === "detail_view")).toMatchObject({
      count: 2,
      sessions: 1,
      attempts: 1,
    });
    expect(data.unclassifiedReservations).toBe(5);
  });
  it("다른 예약 시도의 성공을 신청서 완료로 연결하지 않는다", () => {
    const data = summarizeFlow(
      [e("form_view"), e("completed", { attempt_id: "other" })],
      t,
    );
    expect(data.formCompletionRate).toBe(0);
  });
  it("상품 직접 유입과 최초 유입경로 기준을 보존한다", () => {
    const data = summarizeFlow(
      [
        e("detail_view"),
        e("completed", { ref: "later", occurred_at: "2026-10-05T01:01:00Z" }),
      ],
      t,
    );
    expect(data.directProductSessions).toBe(1);
    expect(data.channels).toHaveLength(1);
    expect(data.channels[0].channel).toBe("insta");
  });
  it("개편 전 단계는 기록 없음이 아닌 수집 전으로 구분할 수 있다", () => {
    expect(summarizeFlow([], null)).toMatchObject({
      startedAt: null,
      sessions: 0,
      formCompletionRate: null,
    });
    expect(summarizeFlow([], t)).toMatchObject({ startedAt: t, sessions: 0 });
  });
  it("문항 버전 분리, 답변 무효화, 오류 중복 제거와 30분 미완료 기준을 적용한다", () => {
    const rows = [
      e("field_view", { field_id: "f", field_label: "성별" }),
      e("field_valid", {
        field_id: "f",
        duration_ms: 3000,
        occurred_at: "2026-10-05T01:00:01Z",
      }),
      e("field_invalid", {
        field_id: "f",
        occurred_at: "2026-10-05T01:00:02Z",
      }),
      e("field_error", { field_id: "f" }),
      e("field_error", { field_id: "f" }),
      e("field_view", {
        field_id: "f",
        form_version: "00000002",
        attempt_id: "b",
        occurred_at: "2026-10-05T01:10:00Z",
      }),
    ];
    const early = summarizeFlow(rows, t, 0, Date.parse("2026-10-05T01:15:00Z"));
    expect(early.fields).toHaveLength(2);
    expect(early.fields[0]).toMatchObject({
      valid: 0,
      errors: 1,
      lastReached: 0,
    });
    const later = summarizeFlow(rows, t, 0, Date.parse("2026-10-05T02:00:00Z"));
    expect(later.fields[0].lastReached).toBe(1);
    expect(later.fields[1].lastReached).toBe(1);
  });
  it("접수 완료 시 마지막 도달을 이탈로 세지 않는다", () => {
    const data = summarizeFlow(
      [e("field_view", { field_id: "f" }), e("completed")],
      t,
      0,
      Date.parse("2026-10-05T02:00:00Z"),
    );
    expect(data.fields[0].lastReached).toBe(0);
  });
});
