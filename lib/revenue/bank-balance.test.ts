import { describe, expect, it } from "vitest";
import {
  convertLegacyBankReference,
  expectedBankBalance,
  parseBankMoney,
  readBankReference,
  summarizeBankBook,
  type BankReference,
} from "./bank-balance";
import type { RevenueExpense, RevenueReservation } from "./summary";
const reservation = (
  patch: Partial<RevenueReservation> = {},
): RevenueReservation => ({
  id: "r",
  status: "payment_confirmed",
  product_id: "p",
  shoot_start: "2026-10-01T03:00:00Z",
  charged_amount: 100_000,
  cost: 20_000,
  ...patch,
});
const expense = (patch: Partial<RevenueExpense> = {}): RevenueExpense => ({
  id: "e",
  month: "2026-10",
  date: "2026-10-01",
  label: "지출",
  amount: 10_000,
  memo: null,
  kind: "other",
  ...patch,
});
const today = new Date("2026-10-01T15:30:00Z");
const reference: BankReference = {
  balance: 500_000,
  bookNet: 70_000,
  date: "2026-10-01",
  adjustment: -30_000,
  memo: "이체",
};
describe("오늘 통장 장부와 기준 잔액", () => {
  it("한국 날짜를 사용하고 미래 촬영의 입금액과 원가를 오늘 장부에서 제외한다", () => {
    const book = summarizeBankBook(
      [reservation({ shoot_start: "2026-12-01T03:00:00Z" })],
      [expense(), expense({ date: "2026-10-03" })],
      today,
    );
    expect(book).toMatchObject({
      today: "2026-10-02",
      receipts: 0,
      shootingCosts: 0,
      expenses: 10_000,
      net: -10_000,
      futureCosts: 1,
    });
  });
  it("신청·입금 대기·취소 입금은 제외하고 완료·노쇼 입금은 포함한다", () => {
    const book = summarizeBankBook(
      [
        reservation({ status: "requested" }),
        reservation({ status: "schedule_confirmed" }),
        reservation({ status: "cancelled" }),
        reservation({ status: "completed" }),
        reservation({ status: "no_show" }),
      ],
      [],
      today,
    );
    expect(book.receipts).toBe(200_000);
    expect(book.cancelledPayments).toBe(1);
    // 원가는 등록 기록과 촬영일로 계산하며 취소 여부로 지우지 않는다.
    expect(book.shootingCosts).toBe(100_000);
  });
  it("오늘 마지막 촬영의 원가는 포함하며 미래 지출과 일자 없는 지출은 제외한다", () => {
    const book = summarizeBankBook(
      [reservation({ shoot_start: "2026-10-02T14:59:00Z" })],
      [
        expense(),
        expense({ kind: "fixed", date: "2026-10-02" }),
        expense({ date: "2026-10-03" }),
        expense({ date: null }),
      ],
      today,
    );
    expect(book.shootingCosts).toBe(20_000);
    expect(book.expenses).toBe(20_000);
    expect(book.undatedExpenses).toBe(1);
  });
  it("미입력 입금액 및 촬영일 없는 원가를 확인 항목으로 센다", () => {
    expect(
      summarizeBankBook(
        [reservation({ charged_amount: null, shoot_start: null })],
        [],
        today,
      ),
    ).toMatchObject({
      receipts: 0,
      shootingCosts: 0,
      missingAmounts: 0,
      undatedReceipts: 1,
      futureCosts: 1,
    });
  });
  it("과거 누적 금액을 중복 더하지 않고 기준 이후 장부 변동과 보정만 반영한다", () => {
    const book = summarizeBankBook([reservation()], [expense()], today);
    expect(expectedBankBalance(book, reference)).toBe(470_000);
    const added = summarizeBankBook(
      [reservation(), reservation({ charged_amount: 50_000, cost: 0 })],
      [expense()],
      today,
    );
    expect(expectedBankBalance(added, reference)).toBe(520_000);
  });
  it("출금과 음수 잔액을 숨기거나 0원으로 자르지 않는다", () => {
    const book = summarizeBankBook([], [expense({ amount: 700_000 })], today);
    expect(
      expectedBankBalance(book, { ...reference, bookNet: 0, adjustment: 0 }),
    ).toBe(-200_000);
  });
  it("원 단위 금액은 쉼표·부호를 허용하되 빈 값·소수·지수·과도한 금액을 거절한다", () => {
    expect(parseBankMoney("-1,000,000")).toBe(-1_000_000);
    expect(parseBankMoney("0")).toBe(0);
    for (const value of [
      "",
      " ",
      "1.5",
      "1e3",
      "NaN",
      "1,000,000,000,001",
      null,
    ])
      expect(parseBankMoney(value)).toBeNull();
  });
  it("저장된 기준이 누락·손상되었으면 잔액을 임의로 0원 처리하지 않는다", () => {
    expect(readBankReference(reference)).toEqual(reference);
    expect(readBankReference({ ...reference, balance: "bad" })).toBeNull();
    expect(readBankReference({ balance: 0 })).toBeNull();
    expect(readBankReference(null)).toBeNull();
  });
});

describe("잔액 계산 기준 전환", () => {
  it("미래 입금 제외 및 예상액 대체 후에도 기존 잔액과 보정을 유지한다", () => {
    const rows = [
      reservation({
        shoot_start: "2026-10-08T03:00:00Z",
        charged_amount: 85000,
      }),
      reservation({ charged_amount: null, estimated_amount: 70000 }),
    ];
    const book = summarizeBankBook(rows, [expense()], today);
    const next = convertLegacyBankReference(reference, book, rows);
    const oldNet = 85000 - 20000 - 10000;
    expect(expectedBankBalance(book, next)).toBe(
      reference.balance + oldNet - reference.bookNet + reference.adjustment,
    );
    expect(next.adjustment).toBe(reference.adjustment);
    expect(next.memo).toBe(reference.memo);
  });
  it("미입력 대체 금액과 명시적인 0원을 구별한다", () => {
    const book = summarizeBankBook(
      [
        reservation({ charged_amount: null, estimated_amount: 85000, cost: 0 }),
        reservation({ charged_amount: 0, estimated_amount: 85000, cost: 0 }),
      ],
      [],
      today,
    );
    expect(book.receipts).toBe(85000);
    expect(book.missingAmounts).toBe(1);
  });
  it("불가능한 지출일과 기준일을 거절한다", () => {
    expect(
      summarizeBankBook([], [expense({ date: "2026-02-30" })], today),
    ).toMatchObject({ expenses: 0, undatedExpenses: 1 });
    expect(readBankReference({ ...reference, date: "2026-02-30" })).toBeNull();
  });
});
