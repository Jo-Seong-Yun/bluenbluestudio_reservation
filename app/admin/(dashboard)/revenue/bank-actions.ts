"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadBankBalanceData } from "@/lib/revenue/bank-load";
import {
  BANK_REFERENCE_KEY,
  parseBankMoney,
  readBankReference,
  type BankReference,
} from "@/lib/revenue/bank-balance";

export type BankBalanceActionState = {
  error?: string;
  reference?: BankReference;
} | null;

export async function saveBankBalanceReference(
  _previous: BankBalanceActionState,
  formData: FormData,
): Promise<BankBalanceActionState> {
  await requireAdmin();
  const mode = formData.get("mode");
  if (mode !== "reference" && mode !== "adjustment")
    return { error: "저장할 항목을 확인해 주십시오." };
  let amount = parseBankMoney(formData.get("amount"));
  if (amount === null)
    return { error: "금액을 원 단위 정수로 입력해 주십시오. (최대 ±1조 원)" };
  const direction = formData.get("direction");
  if (mode === "adjustment" && direction !== null) {
    if (direction !== "in" && direction !== "out")
      return { error: "보정 방향을 확인해 주십시오." };
    amount = direction === "out" ? -Math.abs(amount) : Math.abs(amount);
  }
  try {
    const data = await loadBankBalanceData();
    if (mode === "adjustment" && !data.reference)
      return { error: "먼저 기준 잔액을 설정해 주십시오." };
    const memo = String(formData.get("memo") ?? "").trim();
    if (memo.length > 200)
      return { error: "보정 메모는 200자까지 입력할 수 있습니다." };
    const reference: BankReference =
      mode === "reference"
        ? {
            balance: amount,
            bookNet: data.book.net,
            date: data.book.today,
            adjustment: 0,
            memo: "",
          }
        : { ...data.reference!, adjustment: amount, memo };
    if (!readBankReference(reference))
      return {
        error: "장부 금액이 허용 범위를 넘어 기준을 저장하지 못했습니다.",
      };
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      data: { [BANK_REFERENCE_KEY]: reference },
    });
    if (error)
      return {
        error: "잔액 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.",
      };
    revalidatePath("/admin/revenue");
    return { reference };
  } catch {
    return {
      error: "장부를 불러오지 못해 저장하지 않았습니다. 다시 시도해 주십시오.",
    };
  }
}
