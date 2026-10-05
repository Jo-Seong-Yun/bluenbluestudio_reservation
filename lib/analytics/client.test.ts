import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock("./actions", () => ({ logBookingEvents: mocks.log }));
vi.mock("@/lib/booking/ref-cookie", () => ({
  captureRefFromUrl: () => {},
  readRefCookie: () => "insta",
}));
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));
  mocks.log.mockReset();
  mocks.log.mockResolvedValue(true);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("예약 세션과 시도 추적", () => {
  it("같은 방문의 단계 이동과 새로고침에서 세션·시도 ID를 유지한다", async () => {
    let client = await import("./client");
    const first = client.analyticsContext("p");
    expect(client.analyticsContext("p")).toEqual(first);
    vi.resetModules();
    client = await import("./client");
    expect(client.analyticsContext("p")).toEqual(first);
  });
  it("30분 무활동 후 새로운 세션과 시도로 구분한다", async () => {
    const client = await import("./client");
    const first = client.analyticsContext("p");
    vi.advanceTimersByTime(31 * 60 * 1000);
    const next = client.analyticsContext("p");
    expect(next.sessionId).not.toBe(first.sessionId);
    expect(next.attemptId).not.toBe(first.attemptId);
  });
  it("접수 후 다음 예약은 같은 세션의 새 시도로 기록한다", async () => {
    const client = await import("./client");
    const first = client.analyticsContext("p");
    client.finishAnalyticsAttempt("p");
    const next = client.analyticsContext("p");
    expect(next.sessionId).toBe(first.sessionId);
    expect(next.attemptId).not.toBe(first.attemptId);
  });
  it("저장소 쓰기가 제한돼도 기록마다 세션을 새로 만들지 않는다", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    const client = await import("./client");
    expect(client.analyticsContext("p").sessionId).toBe(
      client.analyticsContext("p").sessionId,
    );
  });
  it("복수 이벤트를 순서대로 보내며 입력 값은 이벤트에 포함하지 않는다", async () => {
    const client = await import("./client");
    client.trackBooking("detail_view", "00000000-0000-4000-8000-000000000001");
    client.trackBooking("times_view", "00000000-0000-4000-8000-000000000001");
    client.flushAnalytics();
    const rows = mocks.log.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(Date.parse(rows[0].occurredAt)).toBeLessThan(
      Date.parse(rows[1].occurredAt),
    );
    expect(rows[0].attemptId).toBe(rows[1].attemptId);
    expect(rows[0]).not.toHaveProperty("answer");
  });
});
