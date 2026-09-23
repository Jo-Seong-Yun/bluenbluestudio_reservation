"use client";

import { toggleEmailRule } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { DeleteRuleButton } from "./delete-rule-button";
import { RuleModal } from "./rule-modal";
import {
  EMAIL_RECIPIENT_LABELS,
  EMAIL_TRIGGER_LABELS,
  type EmailRule,
} from "@/lib/notifications/email-rules-shared";

export type ProductOption = { id: string; name: string };

/**
 * 이메일 규칙 목록. products/[id]의 CustomFieldsSection과 같은 이유로
 * `rules`를 useState로 복사하지 않고 서버 컴포넌트가 준 값을 그대로
 * 쓴다 — 규칙 추가/수정/삭제/토글은 전부 서버 액션의 revalidatePath로
 * 목록을 다시 불러오게 한다(app/admin/actions.ts).
 */
export function EmailRulesSection({
  rules,
  products,
}: {
  rules: EmailRule[];
  products: ProductOption[];
}) {
  function productLabel(productId: string | null): string {
    if (!productId) return "전체 상품";
    return products.find((p) => p.id === productId)?.name ?? "삭제된 상품";
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">이메일 규칙</h1>
          <p className="text-muted mt-1 text-sm">
            손님·사장님에게 나가는 이메일을 원하는 만큼 자유롭게 만들고, 언제(트리거)
            어떤 상품에만 보낼지 정할 수 있습니다. 제목·본문에{" "}
            <code className="bg-surface-subtle rounded px-1">{"{{변수}}"}</code>{" "}
            형태로 쓰면 발송 시 실제 값으로 자동 채워집니다(그 시점에 값이 없는
            변수는 빈칸이 됩니다). 규칙을 지우면 그 트리거에서는 더 이상 이메일이
            나가지 않습니다.
          </p>
        </div>
        <RuleModal products={products} />
      </div>

      {rules.length === 0 ? (
        <p className="text-muted border-border bg-surface rounded-xl border p-6 text-center text-sm">
          아직 이메일 규칙이 없습니다. &quot;규칙 추가&quot;를 눌러 만들어 보시기
          바랍니다.
        </p>
      ) : (
        <ul className="border-border bg-surface divide-border divide-y rounded-xl border">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={`p-4 ${rule.enabled ? "" : "opacity-50"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{rule.name}</span>
                    <span className="bg-surface-subtle rounded-full px-2 py-0.5 text-xs">
                      {EMAIL_TRIGGER_LABELS[rule.triggerType]}
                      {rule.dayOffset ? ` ${rule.dayOffset}일` : ""}
                    </span>
                    <span className="bg-surface-subtle rounded-full px-2 py-0.5 text-xs">
                      {EMAIL_RECIPIENT_LABELS[rule.recipient]}에게
                    </span>
                    <span className="bg-surface-subtle rounded-full px-2 py-0.5 text-xs">
                      {productLabel(rule.productId)}
                    </span>
                    {!rule.enabled ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                        꺼짐
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted mt-1.5 truncate text-xs">
                    {rule.subject}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <form action={toggleEmailRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(rule.enabled)}
                    />
                    <SubmitButton variant="ghost" className="text-xs">
                      {rule.enabled ? "끄기" : "켜기"}
                    </SubmitButton>
                  </form>
                  <RuleModal products={products} rule={rule} />
                  <DeleteRuleButton id={rule.id} name={rule.name} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
