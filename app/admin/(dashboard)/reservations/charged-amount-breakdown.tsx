"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { saveReservationChargedAmount } from "@/app/admin/actions";

const currency = new Intl.NumberFormat("ko-KR");

type Item = { label: string; amount: number };

/**
 * "실제 지불액"을 기본가 한 덩어리로 받지 않고, 기본가와 손님이 고른
 * 각 옵션을 줄마다 따로 입력받는다 — 할인이 항목별로 다르게 붙을 수
 * 있어서다(예: 옵션만 무료 증정). 줄들의 합계가 곧 실제 지불액이고,
 * 그 합계와 항목 배열을 그대로 저장해 다음에 열었을 때도 항목별로
 * 이어서 고칠 수 있다. 저장된 적 없으면 기본가·신청 시점 예상 옵션
 * 금액으로 초기값을 채운다.
 */
export function ChargedAmountBreakdown({
  reservationId,
  basePrice,
  defaultOptionItems,
  initialBreakdown,
  initialMemo,
}: {
  reservationId: string;
  basePrice: number;
  defaultOptionItems: Item[];
  initialBreakdown: Item[] | null;
  initialMemo: string | null;
}) {
  const initialItems: Item[] =
    initialBreakdown && initialBreakdown.length > 0
      ? initialBreakdown
      : [{ label: "기본가", amount: basePrice }, ...defaultOptionItems];

  const [labels] = useState(initialItems.map((it) => it.label));
  const [amounts, setAmounts] = useState(
    initialItems.map((it) => String(it.amount)),
  );
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  const total = amounts.reduce((sum, a) => sum + (Number(a) || 0), 0);

  function handleAmountChange(index: number, value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    setAmounts((prev) => prev.map((a, i) => (i === index ? digits : a)));
    setJustSaved(false);
  }

  function handleMemoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMemo(e.target.value);
    setJustSaved(false);
  }

  function handleSave() {
    const items: Item[] = labels.map((label, i) => ({
      label,
      amount: Number(amounts[i]) || 0,
    }));
    const formData = new FormData();
    formData.set("id", reservationId);
    formData.set("chargedAmountBreakdown", JSON.stringify(items));
    formData.set("chargedAmountMemo", memo);
    startTransition(async () => {
      await saveReservationChargedAmount(formData);
      setJustSaved(true);
    });
  }

  return (
    <div className="border-border mt-4 border-t pt-4">
      <label className="mb-1.5 block text-sm font-medium">
        실제 지불액{" "}
        <span className="text-muted font-normal">
          (할인 등으로 정가와 다를 수 있습니다. 매출관리 매출 계산에
          사용됩니다)
        </span>
      </label>

      <div className="space-y-1.5">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted w-28 shrink-0 truncate text-sm">
              {label}
            </span>
            <div className="border-border bg-surface focus-within:border-brand focus-within:ring-brand/30 flex w-full items-center gap-1 rounded-lg border pl-3 focus-within:ring-2">
              <span className="text-muted shrink-0">₩</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={
                  focusedIndex === i
                    ? amounts[i]
                    : amounts[i]
                      ? currency.format(Number(amounts[i]))
                      : ""
                }
                onChange={(e) => handleAmountChange(i, e.target.value)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                className="w-full bg-transparent py-2 pr-3 text-base outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          합계 ₩{currency.format(total)}
        </span>
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
