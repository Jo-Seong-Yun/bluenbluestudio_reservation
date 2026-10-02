import "server-only";
import { createClient } from "@/lib/supabase/server";
import { readAllRevenueRows } from "./pagination";
import {
  BANK_REFERENCE_KEY,
  readBankReference,
  summarizeBankBook,
  type BankBalanceData,
} from "./bank-balance";

export async function loadBankBalanceData(): Promise<BankBalanceData> {
  const supabase = await createClient();
  const [reservations, expenses, auth] = await Promise.all([
    readAllRevenueRows((from, to) =>
      supabase
        .from("reservations")
        .select("id, status, product_id, shoot_start, charged_amount, cost", {
          count: "exact",
        })
        .order("id")
        .range(from, to),
    ),
    readAllRevenueRows((from, to) =>
      supabase
        .from("monthly_expenses")
        .select("id, month, date, label, amount, memo, kind", {
          count: "exact",
        })
        .order("id")
        .range(from, to),
    ),
    supabase.auth.getUser(),
  ]);
  if (auth.error || !auth.data.user)
    throw new Error("잔액 설정을 불러오지 못했습니다.");
  return {
    book: summarizeBankBook(reservations, expenses),
    reference: readBankReference(
      auth.data.user.user_metadata[BANK_REFERENCE_KEY],
    ),
  };
}
