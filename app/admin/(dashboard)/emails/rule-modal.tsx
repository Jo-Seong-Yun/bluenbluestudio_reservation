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
import {
  finalizeEmailHtml,
  renderEmailHtml,
  toEditorHtml,
} from "@/lib/notifications/email-html";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Editor } from "@tiptap/react";
import type { ProductOption } from "./email-rules-section";

const initialState: EmailRuleActionState = null;

export function RuleModal({
  products,
  rule,
  siteVariables,
}: {
  products: ProductOption[];
  rule?: EmailRule;
  siteVariables: Record<string, string>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEdit = Boolean(rule);

  const [triggerType, setTriggerType] = useState<EmailTriggerType>(
    rule?.triggerType ?? "on_requested",
  );
  const [recipients, setRecipients] = useState<EmailRecipient[]>(
    rule?.recipients ?? ["customer"],
  );
  const [subject, setSubject] = useState(rule?.subject ?? "");
  const [ctaEnabled, setCtaEnabled] = useState(Boolean(rule?.ctaText));
  const [ctaText, setCtaText] = useState(rule?.ctaText ?? "");
  const [ctaUrl, setCtaUrl] = useState(rule?.ctaUrl ?? "");
  const [body, setBody] = useState(toEditorHtml(rule?.body ?? ""));
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<Editor | null>(null);
  const lastFocused = useRef<"subject" | "body">("body");
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
    setRecipients(rule?.recipients ?? ["customer"]);
    setSubject(rule?.subject ?? "");
    setBody(toEditorHtml(rule?.body ?? ""));
    setCtaEnabled(Boolean(rule?.ctaText));
    setCtaText(rule?.ctaText ?? "");
    setCtaUrl(rule?.ctaUrl ?? "");
    setEpoch((n) => n + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function insertVariable(key: string) {
    const placeholder = `{{${key}}}`;
    if (lastFocused.current === "body") {
      bodyEditorRef.current?.chain().focus().insertContent(placeholder).run();
      return;
    }
    const target = subjectRef.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    setSubject(target.value.slice(0, start) + placeholder + target.value.slice(end));
    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + placeholder.length;
      target.setSelectionRange(cursor, cursor);
    });
  }

  const needsDayOffset = DAY_OFFSET_TRIGGER_TYPES.has(triggerType);

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
        className="border-border bg-surface text-foreground rounded-xl border p-0 backdrop:bg-black/50"
        style={{ width: "calc(100vw - 2rem)", maxWidth: "64rem", margin: "auto" }}
      >
        {/* 헤더 */}
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

        {/* 본문: 좌우 2열 */}
        <div style={{ display: "flex", height: "82vh", overflow: "hidden" }}>

          {/* 좌측: 편집 폼 */}
          <form
            key={epoch}
            action={action}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "1.25rem",
            }}
          >
            <div className="space-y-4">
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
                  <RecipientPicker selected={recipients} onChange={setRecipients} />
                )}
              </div>

              {needsDayOffset ? (
                <div className="sm:w-1/2">
                  <RecipientPicker selected={recipients} onChange={setRecipients} />
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
                <input type="hidden" name="body" value={body} />
                <RichTextEditor
                  initial={body}
                  onChange={setBody}
                  heightClass="h-[280px]"
                  placeholder="손님에게 보낼 내용을 작성해 주십시오."
                  onFocus={() => (lastFocused.current = "body")}
                  editorRef={bodyEditorRef}
                />
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ctaEnabled}
                    onChange={(e) => setCtaEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">CTA 버튼 추가</span>
                </label>
                {ctaEnabled ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      name="ctaText"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="버튼 텍스트 (예: 예약 확인하기)"
                      className={inputClass}
                    />
                    <input
                      name="ctaUrl"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <>
                    <input type="hidden" name="ctaText" value="" />
                    <input type="hidden" name="ctaUrl" value="" />
                  </>
                )}
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
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
              <ErrorText>{state?.error ?? null}</ErrorText>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={close}>
                  취소
                </Button>
                <SubmitButton disabled={pending}>
                  {pending ? "저장 중…" : "저장"}
                </SubmitButton>
              </div>
            </div>
          </form>

          {/* 우측: 미리보기 */}
          <div
            className="border-border"
            style={{
              width: "400px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              borderLeftWidth: "1px",
              padding: "1.25rem",
            }}
          >
            <p className="text-muted mb-2 text-xs font-medium">
              미리보기 — 실제 발송되는 모습 그대로 ({"{{계좌}}"}/{"{{공지}}"}는
              설정값, 나머지는 예시 값)
            </p>
            <div className="border-border bg-surface-subtle mb-2 rounded-lg border px-3 py-2 text-sm">
              <p className="text-muted text-xs">제목</p>
              <p className="font-medium leading-snug">
                {renderEmailTemplate(subject, previewValues)}
              </p>
            </div>
            <iframe
              title="메일 미리보기"
              className="border-border rounded-md border bg-white"
              style={{ flex: 1, minHeight: 0 }}
              srcDoc={finalizeEmailHtml(renderEmailHtml(body, previewValues), {
                ctaText: ctaEnabled ? ctaText : null,
                ctaUrl: ctaEnabled ? ctaUrl : null,
              })}
            />
          </div>

        </div>
      </dialog>
    </>
  );
}

function RecipientPicker({
  selected,
  onChange,
}: {
  selected: EmailRecipient[];
  onChange: (next: EmailRecipient[]) => void;
}) {
  function toggle(value: EmailRecipient) {
    if (!selected.includes(value)) onChange([...selected, value]);
    else if (selected.length > 1) onChange(selected.filter((v) => v !== value));
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">
        받는 사람{" "}
        <span className="text-muted text-xs font-normal">(중복 선택 가능)</span>
      </span>
      <div className="flex gap-1.5">
        {EMAIL_RECIPIENTS.map((value) => {
          const checked = selected.includes(value);
          return (
            <label key={value} className="flex-1">
              <input
                type="checkbox"
                name="recipients"
                value={value}
                checked={checked}
                onChange={() => toggle(value)}
                className="peer sr-only"
              />
              <span className="border-border peer-checked:bg-brand peer-checked:text-brand-foreground peer-checked:border-brand hover:bg-surface-subtle peer-focus-visible:ring-brand block cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors peer-focus-visible:ring-2">
                {checked ? "✓ " : ""}
                {EMAIL_RECIPIENT_LABELS[value]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
