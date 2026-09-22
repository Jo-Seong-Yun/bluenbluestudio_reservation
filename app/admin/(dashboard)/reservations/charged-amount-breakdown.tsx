"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { MoneyInput } from "@/components/money-input";
import { useReportPending } from "@/components/pending-overlay";
import { saveReservationChargedAmount } from "@/app/admin/actions";

const currency = new Intl.NumberFormat("ko-KR");

type Item = { label: string; amount: number };
type EditableItem = { label: string; amount: string };

/**
 * "실제 지불액"을 기본가 한 덩어리로 받지 않고, 기본가와 손님이 고른
 * 각 옵션을 줄마다 따로 입력받는다 — 할인이 항목별로 다르게 붙을 수
 * 있어서다(예: 옵션만 무료 증정). 수기예약은 애초에 유료 옵션을
 * 신청서 문항으로 안 받았을 수도 있어서, 문항에 없던 항목도 여기서
 * 직접 줄을 추가해 이름·금액을 자유롭게 넣을 수 있게 한다(문항편집의
 * 옵션 추가/삭제와 같은 UI 패턴). 줄들의 합계가 곧 실제 지불액이고,
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

  const [items, setItems] = useState<EditableItem[]>(
    initialItems.map((it) => ({ label: it.label, amount: String(it.amount) })),
  );
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  function handleLabelChange(index: number, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, label: value } : it)),
    );
    setJustSaved(false);
  }

  function handleAmountChange(index: number, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, amount: value } : it)),
    );
    setJustSaved(false);
  }

  function handleAddItem() {
    setItems((prev) => [...prev, { label: "", amount: "" }]);
    setJustSaved(false);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setJustSaved(false);
  }

  function handleMemoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMemo(e.target.value);
    setJustSaved(false);
  }

  function handleSave() {
    const payload: Item[] = items.map((it, i) => ({
      label: it.label.trim() || `항목 ${i + 1}`,
      amount: Number(it.amount) || 0,
    }));
    const formData = new FormData();
    formData.set("id", reservationId);
    formData.set("chargedAmountBreakdown", JSON.stringify(payload));
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
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item.label}
              placeholder={`항목 ${i + 1}`}
              onChange={(e) => handleLabelChange(i, e.target.value)}
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 w-28 min-w-0 shrink-0 rounded-lg border px-2 py-2 text-sm outline-none focus:ring-2"
            />
            <MoneyInput
              value={item.amount}
              onChange={(v) => handleAmountChange(i, v)}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => handleRemoveItem(i)}
              aria-label="항목 삭제"
              disabled={items.length <= 1}
              className="text-muted hover:text-foreground shrink-0 disabled:opacity-25"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddItem}
        className="text-brand mt-2 text-sm hover:underline"
      >
        + 옵션 추가
      </button>

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
