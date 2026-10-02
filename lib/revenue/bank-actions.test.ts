import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BANK_REFERENCE_KEY,
  type BankBalanceData,
} from "@/lib/revenue/bank-balance";
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  load: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/revenue/bank-load", () => ({ loadBankBalanceData: mocks.load }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { updateUser: mocks.update } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveBankBalanceReference } from "@/app/admin/(dashboard)/revenue/bank-actions";
const data: BankBalanceData = {
  book: {
    today: "2026-10-02",
    receipts: 400_000,
    shootingCosts: 100_000,
    expenses: 50_000,
    net: 250_000,
    missingAmounts: 0,
    undatedExpenses: 0,
    cancelledPayments: 0,
    futureCosts: 0,
  },
  reference: {
    balance: 500_000,
    bookNet: 100_000,
    date: "2026-10-01",
    adjustment: 0,
    memo: "",
  },
};
const form = (mode: string, amount: string) => {
  const f = new FormData();
  f.set("mode", mode);
  f.set("amount", amount);
  return f;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue("admin");
  mocks.load.mockResolvedValue(data);
  mocks.update.mockResolvedValue({ error: null });
});
describe("관리자 계정 잔액 저장", () => {
  it("실제 잔액을 저장할 때 장부 기준은 서버에서 조회하고 이전 보정을 초기화한다", async () => {
    const f = form("reference", "1,000,000");
    f.set("bookNet", "999999");
    const state = await saveBankBalanceReference(null, f);
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(state?.reference).toEqual({
      balance: 1_000_000,
      bookNet: 250_000,
      date: "2026-10-02",
      adjustment: 0,
      memo: "",
    });
    expect(mocks.update).toHaveBeenCalledWith({
      data: { [BANK_REFERENCE_KEY]: state?.reference },
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/revenue");
  });
  it("수기 보정은 기존 기준 잔액을 유지하고 누적 보정값을 대체한다", async () => {
    const f = form("adjustment", "-30,000");
    f.set("memo", "별도 이체");
    const state = await saveBankBalanceReference(null, f);
    expect(state?.reference).toEqual({
      ...data.reference,
      adjustment: -30_000,
      memo: "별도 이체",
    });
  });
  it("모바일에서 출금 방향과 양수 금액을 입력해 음수 보정으로 저장할 수 있다", async () => {
    const f = form("adjustment", "30,000");
    f.set("direction", "out");
    expect(
      (await saveBankBalanceReference(null, f))?.reference?.adjustment,
    ).toBe(-30_000);
  });
  it("인증이 실패하면 설정을 조회하거나 변경하지 않는다", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("redirect"));
    await expect(
      saveBankBalanceReference(null, form("reference", "100")),
    ).rejects.toThrow("redirect");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("형식 오류와 기준 없는 보정은 기존 저장값을 변경하지 않는다", async () => {
    expect(
      (await saveBankBalanceReference(null, form("reference", "1.5")))?.error,
    ).toBeTruthy();
    mocks.load.mockResolvedValue({ ...data, reference: null });
    expect(
      (await saveBankBalanceReference(null, form("adjustment", "100")))?.error,
    ).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("장부 조회 및 계정 저장 실패를 저장 성공으로 처리하지 않는다", async () => {
    mocks.load.mockRejectedValue(new Error("unavailable"));
    expect(
      (await saveBankBalanceReference(null, form("reference", "100")))?.error,
    ).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.load.mockResolvedValue(data);
    mocks.update.mockResolvedValue({ error: { message: "denied" } });
    expect(
      (await saveBankBalanceReference(null, form("reference", "100")))?.error,
    ).toBeTruthy();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
