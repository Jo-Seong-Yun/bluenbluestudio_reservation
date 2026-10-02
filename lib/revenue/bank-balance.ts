import type { BankForecastData } from "./bank-forecast";
import { parseBirthDate8 } from "@/lib/age";
import { kstDateString } from "@/lib/time";
import {
  REVENUE_STATUSES,
  type RevenueExpense,
  type RevenueReservation,
} from "./summary";

export type BankBookSummary = {
  today: string;
  receipts: number;
  shootingCosts: number;
  expenses: number;
  net: number;
  missingAmounts: number;
  undatedExpenses: number;
  cancelledPayments: number;
  futureCosts: number;
  undatedReceipts?: number;
};
export type BankReference = {
  balance: number;
  bookNet: number;
  date: string;
  adjustment: number;
  memo: string;
};
export type BankBalanceData = {
  book: BankBookSummary;
  reference: BankReference | null;
  forecast?: BankForecastData;
};
export const BANK_REFERENCE_KEY = "bluenblue_bank_reference_v2";
export const BANK_LEGACY_REFERENCE_KEY = "bluenblue_bank_reference_v1";
export const BANK_REFERENCE_CONVERSION_KEY =
  "bluenblue_bank_reference_conversion_v2";
export const BANK_MONEY_LIMIT = 1_000_000_000_000;

/** 원 단위 정수만 허용합니다. 소수·지수·빈 값을 0원으로 바꾸지 않습니다. */
export function parseBankMoney(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim().replaceAll(",", "");
  if (!/^-?\d+$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount) && Math.abs(amount) <= BANK_MONEY_LIMIT
    ? amount
    : null;
}

export function readBankReference(value: unknown): BankReference | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const balance = parseBankMoney(row.balance);
  const bookNet = parseBankMoney(row.bookNet);
  const adjustment = parseBankMoney(row.adjustment);
  if (
    balance === null ||
    bookNet === null ||
    adjustment === null ||
    typeof row.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
    parseBirthDate8(row.date.replaceAll("-", "")) !== row.date
  )
    return null;
  return {
    balance,
    bookNet,
    adjustment,
    date: row.date,
    memo: typeof row.memo === "string" ? row.memo.slice(0, 200) : "",
  };
}

/** 통장 예상 잔액은 기준 잔액에 그 이후의 장부 변동과 수기 보정을 더합니다. */
export function expectedBankBalance(
  book: BankBookSummary,
  reference: BankReference,
): number {
  return (
    reference.balance + book.net - reference.bookNet + reference.adjustment
  );
}

/** 실제 지불액 미입력 시 신청 예상액을 사용하며 명시적인 무료(0원)는 유지합니다. */
export function bankReceiptAmount(row: RevenueReservation): number | null {
  return row.charged_amount ?? row.estimated_amount ?? null;
}

/** 기존 잔액을 유지하는 전환값. 원본 설정과 보정값은 보존합니다. */
export function convertLegacyBankReference(
  legacy: BankReference,
  book: BankBookSummary,
  reservations: RevenueReservation[],
): BankReference {
  const oldReceipts = reservations.reduce(
    (sum, row) =>
      sum +
      (REVENUE_STATUSES.includes(row.status) ? (row.charged_amount ?? 0) : 0),
    0,
  );
  const legacyNet = book.net - book.receipts + oldReceipts;
  return {
    balance: legacy.balance + legacyNet - legacy.bookNet,
    bookNet: book.net,
    date: book.today,
    adjustment: legacy.adjustment,
    memo: legacy.memo,
  };
}

/** 월/연 선택과 무관한 현재 장부. 은행 거래일이 없어 촬영 원가는 촬영일을 사용합니다. */
export function summarizeBankBook(
  reservations: RevenueReservation[],
  expenses: RevenueExpense[],
  now = new Date(),
): BankBookSummary {
  const today = kstDateString(now);
  const result: BankBookSummary = {
    today,
    receipts: 0,
    shootingCosts: 0,
    expenses: 0,
    net: 0,
    missingAmounts: 0,
    undatedExpenses: 0,
    cancelledPayments: 0,
    futureCosts: 0,
    undatedReceipts: 0,
  };
  for (const row of reservations) {
    const shoot = row.shoot_start ? new Date(row.shoot_start) : null;
    const shootDate =
      shoot && Number.isFinite(shoot.getTime()) ? kstDateString(shoot) : null;
    if (REVENUE_STATUSES.includes(row.status)) {
      if (!shootDate)
        result.undatedReceipts = (result.undatedReceipts ?? 0) + 1;
      else if (shootDate <= today) {
        result.receipts += bankReceiptAmount(row) ?? 0;
        if (row.charged_amount === null) result.missingAmounts++;
      }
    }
    if (row.status === "cancelled" && (row.charged_amount ?? 0) > 0)
      result.cancelledPayments++;
    if ((row.cost ?? 0) > 0) {
      if (shootDate && shootDate <= today)
        result.shootingCosts += row.cost ?? 0;
      else result.futureCosts++;
    }
  }
  for (const row of expenses) {
    if (row.kind !== "other" && row.kind !== "fixed") continue;
    if (
      !row.date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      parseBirthDate8(row.date.replaceAll("-", "")) !== row.date
    ) {
      result.undatedExpenses++;
      continue;
    }
    if (row.date <= today) result.expenses += row.amount;
  }
  result.net = result.receipts - result.shootingCosts - result.expenses;
  return result;
}
