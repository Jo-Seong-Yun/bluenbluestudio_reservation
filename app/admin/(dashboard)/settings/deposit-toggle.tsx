"use client";
import { useActionState, useState } from "react";
import { saveDepositMode } from "@/app/admin/deposit-actions";
import { Button, ErrorText } from "@/components/ui";
export function DepositToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [state, action, pending] = useActionState(saveDepositMode, null);
  return (
    <section className="border-border mt-6 rounded-xl border bg-white p-5">
      <h2 className="font-bold">예약금 ON/OFF</h2>
      <p className="text-muted mt-2 text-sm">
        저장 후 접수되는 새 신청부터 적용합니다. 기존 예약은 신청 당시 방식을
        유지합니다.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="depositEnabled" value={String(enabled)} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-label="예약금 사용"
            aria-checked={enabled}
            disabled={pending}
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "left-1 translate-x-5" : "left-1"}`}
            />
          </button>
          <strong>
            {enabled
              ? "ON · 입금확인 후 예약확정"
              : "OFF · 일정확정으로 예약확정"}
          </strong>
        </div>
        <p className="text-muted text-sm">
          {enabled
            ? "입금 계좌·예약금 안내와 기존 입금확인 절차를 사용합니다."
            : "계좌·예약금 안내를 표시하지 않으며, 일정확정 후 완료·노쇼 처리할 수 있습니다."}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "예약금 설정 저장"}
        </Button>
        <ErrorText>{state?.error}</ErrorText>
        {state?.success ? (
          <p role="status" className="text-sm text-green-700">
            저장했습니다. 새 신청부터 적용됩니다.
          </p>
        ) : null}
      </form>
    </section>
  );
}
