"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";

const currency = new Intl.NumberFormat("ko-KR");

/**
 * 지불액/원가처럼 "금액 + 메모"를 한 세트로 입력받는 자리.
 *
 * 입력칸엔 숫자만 넣지만 화면엔 항상 "₩ 20,000"처럼 천단위 구분·통화
 * 기호를 붙여 보여준다 — 그래서 type="number"가 아니라 type="text"로
 * 받아 숫자만 걸러내고, 표시할 땐 toLocaleString으로 다시 포맷한다.
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

  // 타이핑 중엔 콤마 없이 숫자만 그대로 보여준다 — 매 글자마다
  // "1,234"처럼 콤마가 끼어들면 커서 위치가 엉뚱한 곳으로 튀어,
  // 정작 입력한 숫자와 다른 금액이 들어갈 위험이 있다(금액 입력칸에서
  // 특히 치명적). 포커스를 벗어날 때만 원화 형식으로 다시 표시한다.
  const [isFocused, setIsFocused] = useState(false);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value.replace(/[^0-9]/g, ""));
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
        <div className="border-border bg-surface focus-within:border-brand focus-within:ring-brand/30 flex w-full items-center gap-1 rounded-lg border pl-3 focus-within:ring-2">
          <span className="text-muted shrink-0">₩</span>
          <input
            id={amountName}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={isFocused ? amount : amount ? currency.format(Number(amount)) : ""}
            onChange={handleAmountChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent py-2 pr-3 text-base outline-none"
          />
        </div>
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
