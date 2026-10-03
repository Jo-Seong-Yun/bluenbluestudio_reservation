import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  addons: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  row: {
    code: "CODE123",
    status: "payment_confirmed",
    shoot_start: "2026-10-08T03:00:00Z",
    shoot_end: "2026-10-08T04:00:00Z",
    customer_name: "테스트",
    customer_phone: "01000000000",
    people_count: 1,
    memo: "요청",
    admin_memo: "메모",
    google_calendar_event_id: "event",
    product_id: "p",
  },
}));
vi.mock("./addons", () => ({ loadCalendarAddonLines: mocks.addons }));
vi.mock("./env", () => ({
  googleCalendarConfigured: () => true,
  googleCalendarId: () => "calendar",
}));
vi.mock("./calendar-api", () => ({
  createEvent: mocks.create,
  updateEvent: mocks.update,
  deleteEvent: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        update: () => q,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ error: null }).then(resolve),
        maybeSingle: async () => ({
          data:
            table === "reservations"
              ? mocks.row
              : { name: "독백", tag_color: null },
          error: null,
        }),
      };
      return q;
    },
  }),
}));
import { syncReservationToCalendar } from "./sync";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.addons.mockResolvedValue([]);
  mocks.create.mockResolvedValue("new-event");
  mocks.update.mockResolvedValue(undefined);
});
describe("캘린더 상세 추가옵션 연동", () => {
  it("기존 일정 갱신에 추가옵션을 넣고 기존 상세 내용을 보존한다", async () => {
    mocks.addons.mockResolvedValue(["대본 추가 (+10,000원)", "무료 제공"]);
    await syncReservationToCalendar("r");
    expect(mocks.addons).toHaveBeenCalledWith("r");
    expect(mocks.update).toHaveBeenCalledWith(
      "event",
      expect.objectContaining({
        description: expect.stringContaining(
          "추가옵션:\n- 대본 추가 (+10,000원)\n- 무료 제공",
        ),
      }),
    );
    expect(mocks.update.mock.calls[0][1].description).toContain(
      "사장님 메모: 메모",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("선택이 없더라도 없음 항목을 반드시 표시한다", async () => {
    await syncReservationToCalendar("r");
    expect(mocks.update.mock.calls[0][1].description).toContain(
      "추가옵션: 없음",
    );
  });
  it("새 일정 생성에도 동일한 추가옵션을 넣는다", async () => {
    mocks.update.mockRejectedValue(new Error("missing event"));
    mocks.addons.mockResolvedValue(["대본 추가 (+10,000원)"]);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await syncReservationToCalendar("r");
    expect(mocks.create.mock.calls[0][0].description).toContain(
      "추가옵션:\n- 대본 추가 (+10,000원)",
    );
    log.mockRestore();
  });
  it("추가옵션 조회 실패를 없음으로 덮어쓰지 않고 동기화 실패로 남긴다", async () => {
    mocks.addons.mockRejectedValue(new Error("query failed"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await syncReservationToCalendar("r");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
