import { expectedBankBalance, summarizeBankBook } from "./bank-balance";
import { describe, expect, it } from "vitest";
import {
  buildBankForecast,
  summarizeBankForecastAt,
  validBankForecastDate,
  type ForecastReservation,
} from "./bank-forecast";
import type { RevenueExpense } from "./summary";
const reservation = (
  patch: Partial<ForecastReservation> = {},
): ForecastReservation => ({
  id: "r",
  product_id: "p",
  status: "schedule_confirmed",
  shoot_start: "2026-10-05T03:00:00Z",
  charged_amount: null,
  estimated_amount: 100_000,
  cost: 20_000,
  ...patch,
});
const expense = (patch: Partial<RevenueExpense> = {}): RevenueExpense => ({
  id: "e",
  month: "2026-10",
  date: "2026-10-05",
  label: "임대료",
  amount: 30_000,
  memo: null,
  kind: "fixed",
  ...patch,
});
const today = "2026-10-02";
describe("날짜별 통장 잔액 전망", () => {
  it("이미 입금된 미래 예약은 입금을 중복 더하지 않고 미래 원가만 차감한다", () => {
    const f = buildBankForecast(
      [reservation({ status: "payment_confirmed", charged_amount: 100_000 })],
      [],
      today,
    );
    expect(summarizeBankForecastAt(f, "2026-10-05")).toMatchObject({
      income: 0,
      shootingCosts: 20_000,
      change: -20_000,
      prepaidCount: 1,
      unpaidCount: 0,
    });
  });
  it("미입금 예약을 입금 확인으로 바꾸어도 선택일 전망은 입금을 중복 반영하지 않는다", () => {
    const ref = {
      balance: 500_000,
      bookNet: 0,
      date: today,
      adjustment: 0,
      memo: "",
    };
    const pending = [reservation()];
    const paid = [
      reservation({ status: "payment_confirmed", charged_amount: 100_000 }),
    ];
    const now = new Date("2026-10-02T03:00:00Z");
    const before =
      expectedBankBalance(summarizeBankBook(pending, [], now), ref) +
      summarizeBankForecastAt(
        buildBankForecast(pending, [], today),
        "2026-10-05",
      )!.change;
    const after =
      expectedBankBalance(summarizeBankBook(paid, [], now), ref) +
      summarizeBankForecastAt(buildBankForecast(paid, [], today), "2026-10-05")!
        .change;
    expect(before).toBe(580_000);
    expect(after).toBe(before);
  });
  it("미입금 확정 예약은 실제 지불액 우선, 없으면 신청 당시 예상액을 사용하며 명시적인 0원을 유지한다", () => {
    const f = buildBankForecast(
      [
        reservation(),
        reservation({ charged_amount: 80_000 }),
        reservation({ charged_amount: 0 }),
      ],
      [],
      today,
    );
    expect(summarizeBankForecastAt(f, "2026-10-05")).toMatchObject({
      income: 180_000,
      shootingCosts: 60_000,
      change: 120_000,
      unpaidCount: 3,
    });
  });
  it("선택일 당일을 포함하되 이후의 예약과 지출은 포함하지 않는다", () => {
    const f = buildBankForecast(
      [reservation(), reservation({ shoot_start: "2026-10-06T03:00:00Z" })],
      [expense(), expense({ date: "2026-10-06" })],
      today,
    );
    expect(summarizeBankForecastAt(f, "2026-10-04")?.change).toBe(0);
    expect(summarizeBankForecastAt(f, "2026-10-05")).toMatchObject({
      income: 100_000,
      shootingCosts: 20_000,
      expenses: 30_000,
      change: 50_000,
    });
    expect(summarizeBankForecastAt(f, "2026-10-06")?.change).toBe(100_000);
  });
  it("한국 날짜 경계와 연도 경계를 넘어 정확히 해당 일자에 반영한다", () => {
    const f = buildBankForecast(
      [reservation({ shoot_start: "2026-12-31T15:00:00Z" })],
      [],
      "2026-12-31",
    );
    expect(summarizeBankForecastAt(f, "2026-12-31")?.change).toBe(0);
    expect(summarizeBankForecastAt(f, "2027-01-01")?.change).toBe(80_000);
  });
  it("오늘의 입금 확인 예약과 지난 지출은 전망에 중복 반영하지 않는다", () => {
    const f = buildBankForecast(
      [
        reservation({
          shoot_start: "2026-10-02T03:00:00Z",
          status: "completed",
        }),
      ],
      [expense({ date: today }), expense({ date: "2026-09-30" })],
      today,
    );
    expect(summarizeBankForecastAt(f, today)).toMatchObject({
      income: 0,
      shootingCosts: 0,
      expenses: 0,
      change: 0,
      days: [],
    });
  });
  it("오늘 미입금 예약은 오늘 마감 예상 입금에 포함하지만 오늘 원가는 다시 차감하지 않는다", () => {
    const f = buildBankForecast(
      [reservation({ shoot_start: "2026-10-02T03:00:00Z" })],
      [expense({ date: today })],
      today,
    );
    expect(summarizeBankForecastAt(f, today)).toMatchObject({
      income: 100_000,
      shootingCosts: 0,
      expenses: 0,
      change: 100_000,
    });
    expect(f.overdueUnpaidCount).toBe(0);
  });
  it("미확정·취소·일자 없는 예약과 연체 미입금은 제외하고 확인할 건수를 남긴다", () => {
    const f = buildBankForecast(
      [
        reservation({ status: "requested" }),
        reservation({ status: "cancelled" }),
        reservation({ shoot_start: null }),
        reservation({ shoot_start: "2026-10-01T03:00:00Z" }),
      ],
      [],
      today,
    );
    expect(f).toMatchObject({
      days: [],
      unconfirmedCount: 1,
      undatedReservationCount: 1,
      overdueUnpaidCount: 1,
    });
  });
  it("예정 금액과 원가 미입력을 명시적 0원과 구별한다", () => {
    const f = buildBankForecast(
      [
        reservation({ estimated_amount: null, cost: null }),
        reservation({ charged_amount: 0, cost: 0 }),
      ],
      [],
      today,
    );
    expect(summarizeBankForecastAt(f, "2026-10-05")).toMatchObject({
      income: 0,
      shootingCosts: 0,
      missingIncomeCount: 1,
      missingCostCount: 1,
    });
  });
  it("등록된 날짜의 고정·기타지출만 차감하고 일자 없는 항목이나 매월 반복 지출을 만들어내지 않는다", () => {
    const f = buildBankForecast(
      [],
      [
        expense(),
        expense({ kind: "other", amount: 15_000 }),
        expense({ date: null }),
      ],
      today,
    );
    expect(summarizeBankForecastAt(f, "2027-01-31")).toMatchObject({
      expenses: 45_000,
      change: -45_000,
    });
    expect(f.days).toHaveLength(1);
  });
  it("과거·빈 값·불가능한 날짜는 전망 결과 대신 오류로 처리한다", () => {
    const f = buildBankForecast([], [], today);
    for (const date of [
      "2026-10-01",
      "",
      "2026-02-30",
      "2026-13-01",
      "2026-10-05junk",
    ])
      expect(summarizeBankForecastAt(f, date)).toBeNull();
    expect(validBankForecastDate("2028-02-29")).toBe(true);
    expect(validBankForecastDate("2027-02-29")).toBe(false);
  });
});
