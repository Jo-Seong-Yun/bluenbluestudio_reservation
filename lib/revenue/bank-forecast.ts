import { parseBirthDate8 } from "@/lib/age";
import { kstDateString } from "@/lib/time";
import {
  REVENUE_STATUSES,
  type RevenueExpense,
  type RevenueReservation,
} from "./summary";

export type ForecastReservation = RevenueReservation & {
  estimated_amount: number | null;
};
export type BankForecastDay = {
  date: string;
  income: number;
  shootingCosts: number;
  expenses: number;
  unpaidCount: number;
  prepaidCount: number;
  missingIncomeCount: number;
  missingCostCount: number;
};
export type BankForecastData = {
  today: string;
  days: BankForecastDay[];
  unconfirmedCount: number;
  undatedReservationCount: number;
  overdueUnpaidCount: number;
};
export type BankForecastSummary = Omit<BankForecastDay, "date"> & {
  date: string;
  change: number;
  days: BankForecastDay[];
};

export function validBankForecastDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    parseBirthDate8(value.replaceAll("-", "")) === value
  );
}

/** 이미 입금된 예약은 다시 더하지 않고 미입금 확정 예약만 촬영일에 입금된다고 가정합니다. */
export function buildBankForecast(
  reservations: ForecastReservation[],
  expenses: RevenueExpense[],
  today: string,
): BankForecastData {
  const days = new Map<string, BankForecastDay>();
  const result: BankForecastData = {
    today,
    days: [],
    unconfirmedCount: 0,
    undatedReservationCount: 0,
    overdueUnpaidCount: 0,
  };
  function day(date: string) {
    let row = days.get(date);
    if (!row) {
      row = {
        date,
        income: 0,
        shootingCosts: 0,
        expenses: 0,
        unpaidCount: 0,
        prepaidCount: 0,
        missingIncomeCount: 0,
        missingCostCount: 0,
      };
      days.set(date, row);
    }
    return row;
  }
  for (const reservation of reservations) {
    if (reservation.status === "requested") {
      result.unconfirmedCount++;
      continue;
    }
    const paid = REVENUE_STATUSES.includes(reservation.status);
    if (!paid && reservation.status !== "schedule_confirmed") continue;
    const instant = reservation.shoot_start
      ? new Date(reservation.shoot_start)
      : null;
    if (!instant || !Number.isFinite(instant.getTime())) {
      result.undatedReservationCount++;
      continue;
    }
    const date = kstDateString(instant);
    if (date < today) {
      if (!paid) result.overdueUnpaidCount++;
      continue;
    }
    if (date === today && paid) continue;
    const item = day(date);
    if (paid) item.prepaidCount++;
    else {
      item.unpaidCount++;
      // 명시적인 0원은 유지하며, 미입력일 때만 신청 시점 예상 금액을 사용합니다.
      const amount = reservation.charged_amount ?? reservation.estimated_amount;
      if (amount === null) item.missingIncomeCount++;
      else item.income += amount;
    }
    // 오늘 원가는 오늘 장부에 이미 반영되어 있으므로 미래 날짜만 추가 차감합니다.
    if (date > today) {
      if (reservation.cost === null) item.missingCostCount++;
      else item.shootingCosts += reservation.cost;
    }
  }
  for (const expense of expenses) {
    if (
      (expense.kind === "other" || expense.kind === "fixed") &&
      expense.date &&
      validBankForecastDate(expense.date) &&
      expense.date > today
    )
      day(expense.date).expenses += expense.amount;
  }
  result.days = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

export function summarizeBankForecastAt(
  forecast: BankForecastData,
  selectedDate: string,
): BankForecastSummary | null {
  if (!validBankForecastDate(selectedDate) || selectedDate < forecast.today)
    return null;
  const days = forecast.days.filter(
    (day) => day.date >= forecast.today && day.date <= selectedDate,
  );
  const result: BankForecastSummary = {
    date: selectedDate,
    income: 0,
    shootingCosts: 0,
    expenses: 0,
    unpaidCount: 0,
    prepaidCount: 0,
    missingIncomeCount: 0,
    missingCostCount: 0,
    change: 0,
    days,
  };
  for (const day of days) {
    result.income += day.income;
    result.shootingCosts += day.shootingCosts;
    result.expenses += day.expenses;
    result.unpaidCount += day.unpaidCount;
    result.prepaidCount += day.prepaidCount;
    result.missingIncomeCount += day.missingIncomeCount;
    result.missingCostCount += day.missingCostCount;
  }
  result.change = result.income - result.shootingCosts - result.expenses;
  return result;
}
