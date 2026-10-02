import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  calls: [] as { table: string; method: string; args: unknown[] }[],
  failure: { table: "", auth: false, update: false },
  metadata: {} as Record<string, unknown>,
  updates: 0,
  concurrent: null as Record<string, unknown> | null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      updateUser: async ({ data }: { data: Record<string, unknown> }) => {
        mocks.updates++;
        if (mocks.failure.update)
          return { data: { user: null }, error: new Error("failed") };
        mocks.metadata = { ...mocks.metadata, ...data, ...mocks.concurrent };
        return {
          data: { user: { user_metadata: mocks.metadata } },
          error: null,
        };
      },
      getUser: async () => ({
        data: {
          user: mocks.failure.auth
            ? null
            : {
                user_metadata: mocks.metadata,
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
import {
  BANK_REFERENCE_KEY,
  BANK_LEGACY_REFERENCE_KEY,
  BANK_REFERENCE_CONVERSION_KEY,
  expectedBankBalance,
} from "./bank-balance";
import { loadBankBalanceData } from "./bank-load";
beforeEach(() => {
  mocks.calls.length = 0;
  mocks.updates = 0;
  mocks.concurrent = null;
  mocks.failure.update = false;
  mocks.metadata = {
    [BANK_REFERENCE_KEY]: {
      balance: 100000,
      bookNet: 0,
      date: "2026-10-01",
      adjustment: 0,
      memo: "",
    },
    other: "preserve",
  };
  mocks.failure.table = "";
  mocks.failure.auth = false;
});
describe("통장 장부 조회", () => {
  it("월/연/촬영일 필터 없이 전체 입금 및 지출을 조회하고 관리자 기준을 가져온다", async () => {
    const data = await loadBankBalanceData();
    expect(data.reference?.balance).toBe(100_000);
    expect(data.forecast).toMatchObject({
      today: data.book.today,
      days: [],
      unconfirmedCount: 0,
      undatedReservationCount: 0,
      overdueUnpaidCount: 0,
    });
    expect(
      mocks.calls.find(
        (c) => c.table === "reservations" && c.method === "select",
      )?.args[0],
    ).toContain("estimated_amount");
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

afterEach(() => vi.useRealTimers());
describe("기존 잔액 전환 저장", () => {
  const legacy = {
    balance: 100000,
    bookNet: 85000,
    date: "2026-10-01",
    adjustment: 5000,
    memo: "보정",
  };
  it("기존 오늘 잔액을 유지하고 한 번만 전환하여 다음 날 재기준화를 방지한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T03:00:00Z"));
    mocks.metadata = { [BANK_LEGACY_REFERENCE_KEY]: legacy, other: "preserve" };
    const first = await loadBankBalanceData();
    expect(expectedBankBalance(first.book, first.reference!)).toBe(20000);
    expect(mocks.updates).toBe(1);
    expect(mocks.metadata[BANK_LEGACY_REFERENCE_KEY]).toEqual(legacy);
    expect(mocks.metadata.other).toBe("preserve");
    expect(mocks.metadata[BANK_REFERENCE_CONVERSION_KEY]).toBeTruthy();
    vi.setSystemTime(new Date("2026-10-08T03:00:00Z"));
    const later = await loadBankBalanceData();
    expect(later.reference).toEqual(first.reference);
    expect(mocks.updates).toBe(1);
  });
  it("새 기준이 있으면 전환 저장하지 않는다", async () => {
    mocks.metadata[BANK_LEGACY_REFERENCE_KEY] = legacy;
    expect((await loadBankBalanceData()).reference?.balance).toBe(100000);
    expect(mocks.updates).toBe(0);
  });
  it("전환 저장 실패 시 잘못된 잔액을 표시하지 않는다", async () => {
    mocks.metadata = { [BANK_LEGACY_REFERENCE_KEY]: legacy };
    mocks.failure.update = true;
    await expect(loadBankBalanceData()).rejects.toThrow("전환하지 못했습니다");
  });
  it("동시에 저장된 새 기준을 덮어쓰지 않는다", async () => {
    mocks.metadata = { [BANK_LEGACY_REFERENCE_KEY]: legacy };
    const current = { ...legacy, balance: 300000 };
    mocks.concurrent = { [BANK_REFERENCE_KEY]: current };
    expect((await loadBankBalanceData()).reference).toEqual(current);
  });
});
