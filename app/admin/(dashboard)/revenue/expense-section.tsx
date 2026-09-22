import { inputClass } from "@/components/ui";
import { SubmitButton, PendingSubmit } from "@/components/submit-button";
import { addMonthlyExpense, deleteMonthlyExpense } from "@/app/admin/actions";
import { MoneyInput } from "@/components/money-input";

type Expense = {
  id: string;
  date: string | null;
  label: string;
  amount: number;
  memo: string | null;
};

/**
 * "기타지출"과 "고정지출"은 구성이 완전히 같은 표+입력폼이라 하나의
 * 컴포넌트로 두고, 어느 쪽인지(kind)만 다르게 넘긴다 — addMonthlyExpense
 * 액션도 숨은 kind 필드로 같은 구분을 쓴다(app/admin/actions.ts).
 */
export function ExpenseSection({
  kind,
  title,
  hint,
  emptyText,
  expenses,
}: {
  kind: "other" | "fixed";
  title: string;
  hint: string;
  emptyText: string;
  expenses: Expense[];
}) {
  return (
    <div className="border-border bg-surface mt-6 rounded-xl border p-4">
      <p className="font-medium">{title}</p>
      <p className="text-muted mt-0.5 text-sm">{hint}</p>

      {expenses.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted border-b text-left">
                <th className="py-2 pr-3 font-medium">일자</th>
                <th className="py-2 pr-3 font-medium">항목</th>
                <th className="py-2 pr-3 font-medium">금액</th>
                <th className="py-2 pr-3 font-medium">비고</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-border border-b last:border-0"
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {expense.date ?? "-"}
                  </td>
                  <td className="py-2 pr-3">{expense.label}</td>
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">
                    {expense.amount.toLocaleString()}원
                  </td>
                  <td className="text-muted py-2 pr-3">
                    {expense.memo ?? ""}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <form action={deleteMonthlyExpense}>
                      <input type="hidden" name="id" value={expense.id} />
                      <PendingSubmit className="text-muted hover:text-foreground text-xs underline">
                        삭제
                      </PendingSubmit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted mt-3 text-sm">{emptyText}</p>
      )}

      <form
        action={addMonthlyExpense}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="kind" value={kind} />
        <label className="w-40">
          <span className="text-muted mb-1 block text-xs">일자</span>
          <input name="date" type="date" required className={inputClass} />
        </label>
        <label className="flex-1 basis-40">
          <span className="text-muted mb-1 block text-xs">항목</span>
          <input
            name="label"
            required
            maxLength={50}
            placeholder="예: 스튜디오 임대료"
            className={inputClass}
          />
        </label>
        <label className="w-36">
          <span className="text-muted mb-1 block text-xs">금액</span>
          <MoneyInput name="amount" required />
        </label>
        <label className="flex-1 basis-40">
          <span className="text-muted mb-1 block text-xs">비고 (선택)</span>
          <input name="memo" maxLength={100} className={inputClass} />
        </label>
        <SubmitButton variant="ghost">추가</SubmitButton>
      </form>
    </div>
  );
}
