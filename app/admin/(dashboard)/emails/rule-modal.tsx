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
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
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
    // 규칙마다 각자 <dialog>를 갖고 있어, 다른 규칙 모달을 닫지 않은 채
    // 열면 이전 모달 위에 새 모달이 계속 쌓인다 — 열기 전에 이미 열려
    // 있는 다른 규칙 모달을 먼저 닫는다.
    document
      .querySelectorAll<HTMLDialogElement>("dialog.email-modal-dialog[open]")
      .forEach((d) => {
        if (d !== dialogRef.current) d.close();
      });
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

  /**
   * 선 없는 표 형식의 "요약 박스"를 커서 위치에 끼워 넣는다 — 라벨/값은
   * 예시로 채워두되, 어떤 항목을 넣을지·순서·위치는 전부 직접 고치도록
   * 둔다. 셀의 style(border:none)은 RichTextEditor의 TableCell 확장이
   * 그대로 기억해 두므로, 발송 시 finalizeEmailHtml이 다른 표에만
   * 넣는 테두리가 이 표에는 붙지 않는다.
   */
  function insertSummaryBox() {
    const labelStyle =
      "border:none;padding:4px 12px 4px 0;font-weight:600;color:#6b7280;white-space:nowrap;vertical-align:top;";
    const valueStyle = "border:none;padding:4px 0;vertical-align:top;";
    const rows: [string, string][] = [
      ["예약 번호", "{{예약번호}}"],
      ["상품", "{{상품명}}"],
      ["촬영 일시", "{{일시}}"],
      ["촬영 장소", "{{촬영장소}}"],
    ];
    const rowsHtml = rows
      .map(
        ([label, value]) =>
          `<tr><td style="${labelStyle}">${label}</td><td style="${valueStyle}">${value}</td></tr>`,
      )
      .join("");
    bodyEditorRef.current
      ?.chain()
      .focus()
      .insertContent(`<table><tbody>${rowsHtml}</tbody></table><p></p>`)
      .run();
  }

  const needsDayOffset = DAY_OFFSET_TRIGGER_TYPES.has(triggerType);

  const previewValues = {
    ...EMAIL_VARIABLE_PREVIEW_VALUES,
    ...(siteVariables.계좌 ? { 계좌: siteVariables.계좌 } : {}),
    ...(siteVariables.공지 ? { 공지: siteVariables.공지 } : {}),
  };

  const previewHtml = finalizeEmailHtml(renderEmailHtml(body, previewValues), {
    ctaText: ctaEnabled ? ctaText : null,
    ctaUrl: ctaEnabled ? ctaUrl : null,
  });

  // <iframe srcDoc>은 값이 바뀌어도 일부 브라우저에서 다시 그리지 않는
  // 경우가 있어, 본문을 고칠 때마다 직접 document.write로 새로 그려
  // 우측 미리보기가 실시간으로 반영되게 한다.
  useEffect(() => {
    const doc = previewIframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

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
        className="email-modal-dialog border-border bg-surface text-foreground rounded-xl border p-0 backdrop:bg-black/50"
        style={{ width: "calc(100vw - 2rem)", maxWidth: "64rem", margin: "auto" }}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-inherit px-5 py-4">
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

        {/* 본문: PC 좌우 2열 / 모바일 위아래 1열 (globals.css .email-modal-body) */}
        <div className="email-modal-body">

          {/* 좌측(PC) / 위(모바일): 편집 폼 */}
          <form
            key={epoch}
            action={action}
            className="email-modal-form"
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
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium">본문</label>
                  <button
                    type="button"
                    onClick={insertSummaryBox}
                    className="text-brand text-xs font-medium hover:underline"
                  >
                    + 요약 박스 삽입
                  </button>
                </div>
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

          {/* 우측(PC) / 아래(모바일): 미리보기 */}
          <div className="email-modal-preview border-border">
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
              ref={previewIframeRef}
              title="메일 미리보기"
              className="border-border rounded-md border bg-white"
              style={{ flex: 1, minHeight: 0 }}
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
