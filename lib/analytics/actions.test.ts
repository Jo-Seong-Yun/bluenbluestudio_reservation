import { AuthSessionMissingError } from "@supabase/supabase-js";
import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authError: null as Error | null,
  user: false,
  failure: false,
  upsert: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mocks.user ? {} : null },
        error: mocks.authError,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        in: () => q,
        eq: () => q,
        then: (resolve: (x: unknown) => unknown) =>
          Promise.resolve({
            data:
              table === "products"
                ? [{ id: "00000000-0000-4000-8000-000000000003" }]
                : [
                    {
                      id: "00000000-0000-4000-8000-000000000004",
                      product_id: "00000000-0000-4000-8000-000000000003",
                      label: "문항",
                      sort_order: 0,
                    },
                  ],
            error: mocks.failure ? new Error("failed") : null,
          }).then(resolve),
        upsert: mocks.upsert,
      };
      return q;
    },
  }),
}));
import { logBookingEvents } from "./actions";
const event = {
  occurredAt: "2026-10-05T01:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  attemptId: "00000000-0000-4000-8000-000000000005",
  productId: "00000000-0000-4000-8000-000000000003",
  kind: "form_view",
  ref: "insta",
  device: "mobile",
  fieldId: null,
  formVersion: "00000001",
  durationMs: null,
  errorCode: null,
};
beforeEach(() => {
  mocks.authError = new AuthSessionMissingError();
  mocks.user = false;
  mocks.failure = false;
  mocks.upsert.mockReset();
  mocks.upsert.mockResolvedValue({ error: null });
});
describe("예약 통계 서버 기록", () => {
  it("로그인 세션이 없는 실제 고객은 기록하고 인증 서버 오류는 제외한다", async () => {
    expect(await logBookingEvents([event])).toBe(true);
    mocks.upsert.mockClear();
    mocks.authError = new Error("auth unavailable");
    expect(await logBookingEvents([event])).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("접수 완료 위조와 답변 내용 전송을 거절한다", async () => {
    expect(await logBookingEvents([{ ...event, kind: "completed" }])).toBe(
      false,
    );
    expect(await logBookingEvents([{ ...event, answer: "비공개 답변" }])).toBe(
      false,
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("관리자 방문을 기록하지 않는다", async () => {
    mocks.user = true;
    expect(await logBookingEvents([event])).toBe(true);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("개인 답변 없이 허용 이벤트와 서버 문항 라벨만 저장하며 재시도 중복을 막는다", async () => {
    expect(
      await logBookingEvents([
        {
          ...event,
          kind: "field_valid",
          fieldId: "00000000-0000-4000-8000-000000000004",
        },
      ]),
    ).toBe(true);
    expect(mocks.upsert.mock.calls[0][0][0]).toMatchObject({
      event_kind: "field_valid",
      field_label: "문항",
    });
    expect(mocks.upsert.mock.calls[0][1]).toEqual({
      onConflict: "id",
      ignoreDuplicates: true,
    });
  });
  it("서버 실패가 예약 화면 예외로 전파되지 않는다", async () => {
    mocks.failure = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await logBookingEvents([event])).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
