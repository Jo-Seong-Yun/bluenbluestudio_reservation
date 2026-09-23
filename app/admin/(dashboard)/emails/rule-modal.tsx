"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveEmailRule,
  type EmailRuleActionState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  DAY_OFFSET_TRIGGER_TYPES,
  EMAIL_RECIPIENTS,
  EMAIL_RECIPIENT_LABELS,
  EMAIL_TRIGGER_LABELS,
  EMAIL_TRIGGER_TYPES,
  EMAIL_VARIABLES,
  EMAIL_VARIABLE_PREVIEW_VALUES,
  renderEmailTemplate,
  type EmailRecipient,
  type EmailRule,
  type EmailTriggerType,
} from "@/lib/notifications/email-rules-shared";
import type { ProductOption } from "./email-rules-section";

const initialState: EmailRuleActionState = null;

/**
 * 이메일 규칙 추가/수정 모달. 문항 추가/수정 모달(field-modal.tsx)과
 * 같은 구조를 따른다 — 다만 여기는 저장 실패(제목/본문 누락 등)를
 * 화면에 보여줘야 해서 useActionState로 상태를 들고, 성공했을 때만
 * 닫는다.
 */
export function RuleModal({
  products,
  rule,
  siteVariables,
}: {
  products: ProductOption[];
  rule?: EmailRule;
  /** 미리보기에서 {{계좌}}/{{공지}}는 예시값 대신 이 실제 설정값을 보여준다. */
  siteVariables: Record<string, string>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEdit = Boolean(rule);

  const [triggerType, setTriggerType] = useState<EmailTriggerType>(
    rule?.triggerType ?? "on_requested",
  );
  const [subject, setSubject] = useState(rule?.subject ?? "");
  const [body, setBody] = useState(rule?.body ?? "");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");
  // 모달을 다시 열 때마다 이전 입력을 지우고 원래 값으로 되돌리기 위한 리마운트 키.
  const [epoch, setEpoch] = useState(0);

  const [state, action, pending] = useActionState<
    EmailRuleActionState,
    FormData
  >(saveEmailRule, initialState);

  useEffect(() => {
    if (state?.success) {
      dialogRef.current?.close();
    }
  }, [state]);

  function open() {
    setTriggerType(rule?.triggerType ?? "on_requested");
    setSubject(rule?.subject ?? "");
    setBody(rule?.body ?? "");
    setEpoch((n) => n + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function insertVariable(key: string) {
    const placeholder = `{{${key}}}`;
    const target =
      lastFocused.current === "subject" ? subjectRef.current : bodyRef.current;

    if (!target) {
      setBody((prev) => prev + placeholder);
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const next = target.value.slice(0, start) + placeholder + target.value.slice(end);

    if (target === subjectRef.current) setSubject(next);
    else setBody(next);

    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + placeholder.length;
      target.setSelectionRange(cursor, cursor);
    });
  }

  const needsDayOffset = DAY_OFFSET_TRIGGER_TYPES.has(triggerType);

  // {{계좌}}/{{공지}}는 예시가 아니라 실제 설정값이 궁금해서 미리보기를
  // 보는 경우가 많아, 값이 있으면 그걸로 덮어쓴다(설정에 아직 아무것도
  // 안 넣었으면 예시값을 그대로 보여준다).
  const previewValues = {
    ...EMAIL_VARIABLE_PREVIEW_VALUES,
    ...(siteVariables.계좌 ? { 계좌: siteVariables.계좌 } : {}),
    ...(siteVariables.공지 ? { 공지: siteVariables.공지 } : {}),
  };

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={open}
          aria-label="규칙 수정"
          className="border-border hover:bg-surface-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm"
        >
          ✎
        </button>
      ) : (
        <Button type="button" onClick={open}>
          규칙 추가
        </Button>
      )}

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-lg rounded-xl border p-0 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">{isEdit ? "규칙 수정" : "규칙 추가"}</p>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form
          key={epoch}
          action={action}
          className="max-h-[75vh] space-y-4 overflow-y-auto p-5"
        >
          {isEdit && rule ? (
            <input type="hidden" name="id" value={rule.id} />
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
              규칙 이름 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              defaultValue={rule?.name ?? ""}
              placeholder="예: 프로필 촬영 확정 안내"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="triggerType"
              >
                보낼 시점 <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <select
                id="triggerType"
                name="triggerType"
                required
                value={triggerType}
                onChange={(e) =>
                  setTriggerType(e.target.value as EmailTriggerType)
                }
                className={inputClass}
              >
                {EMAIL_TRIGGER_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {EMAIL_TRIGGER_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            {needsDayOffset ? (
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="dayOffset"
                >
                  며칠{" "}
                  {triggerType === "days_before_shoot" ? "전" : "후"}{" "}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="dayOffset"
                  name="dayOffset"
                  type="number"
                  min={1}
                  required
                  defaultValue={rule?.dayOffset ?? 1}
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <span className="mb-1.5 block text-sm font-medium">받는 사람</span>
                <div className="flex gap-1.5">
                  {EMAIL_RECIPIENTS.map((value) => (
                    <RecipientOption key={value} value={value} rule={rule} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {needsDayOffset ? (
            <div className="sm:w-1/2">
              <span className="mb-1.5 block text-sm font-medium">받는 사람</span>
              <div className="flex gap-1.5">
                {EMAIL_RECIPIENTS.map((value) => (
                  <RecipientOption key={value} value={value} rule={rule} />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="productId"
            >
              적용 상품
            </label>
            <select
              id="productId"
              name="productId"
              defaultValue={rule?.productId ?? ""}
              className={inputClass}
            >
              <option value="">전체 상품</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">제목</label>
            <input
              ref={subjectRef}
              name="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => (lastFocused.current = "subject")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">본문</label>
            <textarea
              ref={bodyRef}
              name="body"
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => (lastFocused.current = "body")}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </div>

          <div>
            <p className="text-muted mb-1.5 text-xs font-medium">
              사용 가능한 변수 (눌러서 커서 위치에 삽입)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.description}
                  onClick={() => insertVariable(v.key)}
                  className="border-border bg-surface-subtle hover:bg-brand hover:text-brand-foreground hover:border-brand rounded-md border px-2 py-1 font-mono text-xs transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="border-border border-t pt-3">
            <p className="text-muted mb-1.5 text-xs font-medium">
              미리보기 ({"{{계좌}}"}/{"{{공지}}"}는 설정값, 나머지는 예시 값으로
              채워본 모습)
            </p>
            <div className="border-border bg-surface-subtle rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {renderEmailTemplate(subject, previewValues)}
              </p>
              <p className="text-muted mt-2 whitespace-pre-wrap">
                {renderEmailTemplate(body, previewValues)}
              </p>
            </div>
          </div>

          <ErrorText>{state?.error ?? null}</ErrorText>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

function RecipientOption({
  value,
  rule,
}: {
  value: EmailRecipient;
  rule?: EmailRule;
}) {
  const defaultChecked = (rule?.recipient ?? "customer") === value;
  return (
    <label className="flex-1">
      <input
        type="radio"
        name="recipient"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="border-border peer-checked:bg-brand peer-checked:text-brand-foreground peer-checked:border-brand hover:bg-surface-subtle block cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors">
        {EMAIL_RECIPIENT_LABELS[value]}
      </span>
    </label>
  );
}
