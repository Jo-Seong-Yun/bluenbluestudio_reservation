"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { MoneyInput } from "@/components/money-input";
import { useReportPending } from "@/components/pending-overlay";

/**
 * 지불액/원가처럼 "금액 + 메모"를 한 세트로 입력받는 자리. 금액 칸
 * 자체는 사이트 전체가 공통으로 쓰는 MoneyInput(₩ 접두사 + 실시간
 * 천단위 콤마)을 그대로 쓴다.
 *
 * 저장 버튼은 누르기 전엔 "저장", 누른 직후엔 "저장됨"으로 바뀌어
 * 지금 화면에 보이는 값이 실제로 반영됐다는 걸 알려준다. 이후 금액이나
 * 메모를 조금이라도 고치면 아직 반영 안 된 값이라는 뜻으로 다시
 * "저장"으로 되돌아간다.
 */
export function MoneyField({
  reservationId,
  label,
  hint,
  amountName,
  memoName,
  initialAmount,
  initialMemo,
  action,
}: {
  reservationId: string;
  label: string;
  hint: React.ReactNode;
  amountName: string;
  memoName: string;
  initialAmount: number | null;
  initialMemo: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [amount, setAmount] = useState(
    initialAmount != null ? String(initialAmount) : "",
  );
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  function handleAmountChange(value: string) {
    setAmount(value);
    setJustSaved(false);
  }

  function handleMemoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMemo(e.target.value);
    setJustSaved(false);
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("id", reservationId);
    formData.set(amountName, amount);
    formData.set(memoName, memo);
    startTransition(async () => {
      await action(formData);
      setJustSaved(true);
    });
  }

  return (
    <div className="border-border mt-4 border-t pt-4">
      <label className="mb-1.5 block text-sm font-medium" htmlFor={amountName}>
        {label} <span className="text-muted font-normal">{hint}</span>
      </label>
      <div className="flex gap-2">
        <MoneyInput
          id={amountName}
          value={amount}
          onChange={handleAmountChange}
          className="w-full"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={handleSave}
          disabled={isPending}
          className="shrink-0"
        >
          {isPending ? "저장 중…" : justSaved ? "저장됨" : "저장"}
        </Button>
      </div>
      <textarea
        rows={2}
        placeholder="메모"
        value={memo}
        onChange={handleMemoChange}
        className="border-border bg-surface focus:border-brand focus:ring-brand/30 mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
      />
    </div>
  );
}
