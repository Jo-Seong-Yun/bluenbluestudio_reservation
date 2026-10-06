import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  rules: vi.fn(),
  sent: vi.fn(),
  send: vi.fn(),
  sms: vi.fn(),
  options: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/notifications/notify", () => ({
  hasRuleEmailBeenSent: mocks.sent,
  sendDayOffsetRuleEmail: mocks.send,
  notifyCustomerReminder: mocks.sms,
}));
vi.mock("@/lib/notifications/email-rules", () => ({
  loadDayOffsetEmailRules: mocks.rules,
  ruleRecipientAddresses: () => ["test@example.com"],
}));
vi.mock("@/lib/notifications/admin-contact", () => ({
  getAdminNotifyEmail: async () => null,
}));
vi.mock("@/lib/notifications/product-name", () => ({
  getProductName: async () => "상품",
}));
vi.mock("@/lib/booking/custom-fields", () => ({
  loadSelectedPricedOptions: mocks.options,
}));
vi.mock("@/lib/notifications/templates", () => ({
  buildEmailVariables: () => ({}),
}));
import { GET } from "@/app/api/cron/reminders/route";
const request = (auth = "Bearer test") =>
  new NextRequest("https://test/api/cron/reminders", {
    headers: { authorization: auth },
  });
const rule = {
  id: "r",
  triggerType: "days_before_shoot",
  dayOffset: 1,
  sendTime: "09:30",
  schedulingStartedAt: "2026-10-01T00:00:00Z",
  productId: null,
  recipients: ["customer"],
};
const booking = {
  id: "b",
  shoot_start: "2026-10-08T05:00:00Z",
  product_id: "p",
  team_emails: [],
};
function query(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const name of [
    "select",
    "in",
    "is",
    "gte",
    "lt",
    "not",
    "order",
    "range",
    "eq",
  ])
    q[name] = vi.fn(() => q);
  q.then = (resolve: (result: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T00:30:00Z"));
  vi.stubEnv("CRON_SECRET", "test");
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.rules.mockResolvedValue([rule]);
  mocks.sent.mockResolvedValue(false);
  mocks.options.mockResolvedValue([]);
  mocks.send.mockResolvedValue(undefined);
  mocks.from.mockImplementation(() => query({ data: [booking], error: null }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("매분 예약 자동 안내", () => {
  it("시각 도달 후 발송하고 이전에는 보내지 않음", async () => {
    await GET(request());
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.sms).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "release_reminder_cron",
      expect.anything(),
    );
    vi.setSystemTime(new Date("2026-10-07T00:29:59Z"));
    mocks.send.mockClear();
    await GET(request());
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("이미 성공한 수신자는 재발송하지 않음", async () => {
    mocks.sent.mockResolvedValue(true);
    await GET(request());
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("겹친 실행은 예약 조회/발송 전에 중단", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await GET(request())).status).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("DB 조회 실패에도 잠금을 해제하고 실패 응답", async () => {
    mocks.from.mockImplementation(() =>
      query({ data: null, error: { message: "DB error" } }),
    );
    expect((await GET(request())).status).toBe(500);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "release_reminder_cron",
      expect.anything(),
    );
  });
  it("비밀 키가 없거나 잘못된 요청이면 실행하지 않음", async () => {
    expect((await GET(request("bad"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer undefined"))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("발송 기록 조회 오류를 0건으로 간주하지 않음", async () => {
    mocks.sent.mockRejectedValue(new Error("logs unavailable"));
    expect((await GET(request())).status).toBe(500);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "release_reminder_cron",
      expect.anything(),
    );
  });
});
