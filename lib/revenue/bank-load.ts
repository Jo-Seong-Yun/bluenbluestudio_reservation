import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildBankForecast } from "./bank-forecast";
import { readAllRevenueRows } from "./pagination";
import {
  BANK_REFERENCE_KEY,
  BANK_LEGACY_REFERENCE_KEY,
  BANK_REFERENCE_CONVERSION_KEY,
  convertLegacyBankReference,
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
        .select(
          "id, status, product_id, shoot_start, charged_amount, cost, estimated_amount",
          {
            count: "exact",
          },
        )
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
  const book = summarizeBankBook(reservations, expenses);
  const metadata = auth.data.user.user_metadata;
  let reference = readBankReference(metadata[BANK_REFERENCE_KEY]);
  if (!reference) {
    const legacy = readBankReference(metadata[BANK_LEGACY_REFERENCE_KEY]);
    if (legacy) {
      const saved = metadata[BANK_REFERENCE_CONVERSION_KEY];
      const source =
        saved && typeof saved === "object"
          ? readBankReference(saved.source)
          : null;
      const converted =
        saved && typeof saved === "object"
          ? readBankReference(saved.reference)
          : null;
      if (
        source &&
        converted &&
        JSON.stringify(source) === JSON.stringify(legacy)
      )
        reference = converted;
      else {
        const next = convertLegacyBankReference(legacy, book, reservations);
        if (!readBankReference(next))
          throw new Error("기존 잔액 기준을 전환할 수 없습니다.");
        // 별도 키에 저장하여 원본 설정과 동시에 저장되는 새 기준을 덮어쓰지 않습니다.
        const { data: updated, error } = await supabase.auth.updateUser({
          data: {
            [BANK_REFERENCE_CONVERSION_KEY]: {
              source: legacy,
              reference: next,
            },
          },
        });
        if (error || !updated.user)
          throw new Error(
            "잔액 계산 기준을 전환하지 못했습니다. 다시 불러와 주십시오.",
          );
        const current = updated.user.user_metadata;
        reference = readBankReference(current[BANK_REFERENCE_KEY]);
        if (!reference) {
          const currentLegacy = readBankReference(
            current[BANK_LEGACY_REFERENCE_KEY],
          );
          if (JSON.stringify(currentLegacy) !== JSON.stringify(legacy))
            throw new Error(
              "잔액 설정이 변경되었습니다. 다시 불러와 주십시오.",
            );
          reference = next;
        }
      }
    }
  }
  return {
    book,
    forecast: buildBankForecast(reservations, expenses, book.today),
    reference,
  };
}
