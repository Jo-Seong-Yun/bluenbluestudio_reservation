import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  calls: [] as { table: string; method: string; args: unknown[] }[],
  failure: { table: "", auth: false },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: mocks.failure.auth
            ? null
            : {
                user_metadata: {
                  bluenblue_bank_reference_v1: {
                    balance: 100_000,
                    bookNet: 0,
                    date: "2026-10-01",
                    adjustment: 0,
                    memo: "",
                  },
                },
              },
        },
        error: mocks.failure.auth ? new Error("unavailable") : null,
      }),
    },
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "order"])
        builder[method] = (...args: unknown[]) => {
          mocks.calls.push({ table, method, args });
          return builder;
        };
      builder.range = async (...args: unknown[]) => {
        mocks.calls.push({ table, method: "range", args });
        return mocks.failure.table === table
          ? { data: null, error: new Error("unavailable"), count: null }
          : { data: [], error: null, count: 0 };
      };
      return builder;
    },
  }),
}));
import { loadBankBalanceData } from "./bank-load";
beforeEach(() => {
  mocks.calls.length = 0;
  mocks.failure.table = "";
  mocks.failure.auth = false;
});
describe("통장 장부 조회", () => {
  it("월/연/촬영일 필터 없이 전체 입금 및 지출을 조회하고 관리자 기준을 가져온다", async () => {
    const data = await loadBankBalanceData();
    expect(data.reference?.balance).toBe(100_000);
    expect(
      mocks.calls.filter((c) => c.method === "select").map((c) => c.table),
    ).toEqual(["reservations", "monthly_expenses"]);
    expect(
      mocks.calls.some((c) => ["gte", "lt", "in"].includes(c.method)),
    ).toBe(false);
    expect(mocks.calls.filter((c) => c.method === "range")).toHaveLength(2);
  });
  it("지출 조회 실패를 잔액 0원으로 처리하지 않는다", async () => {
    mocks.failure.table = "monthly_expenses";
    await expect(loadBankBalanceData()).rejects.toThrow("불러오지 못했습니다");
  });
  it("관리자 잔액 설정 조회 실패를 기준 미설정으로 처리하지 않는다", async () => {
    mocks.failure.auth = true;
    await expect(loadBankBalanceData()).rejects.toThrow("잔액 설정");
  });
});
