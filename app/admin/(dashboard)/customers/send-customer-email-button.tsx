"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  sendCustomerEmails,
  type SendCustomerEmailState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { TeamRecipientsField } from "@/components/team-recipients-field";
import { SubmitButton } from "@/components/submit-button";
import {
  EMAIL_VARIABLES,
  MAX_CTA_BUTTONS,
  renderEmailTemplate,
  type CtaButton,
  type EmailRule,
} from "@/lib/notifications/email-rules-shared";
import {
  finalizeEmailHtml,
  renderEmailHtml,
  toEditorHtml,
} from "@/lib/notifications/email-html";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Editor } from "@tiptap/react";

const initialState: SendCustomerEmailState = { status: "idle" };
const CUSTOM_VALUE = "__custom__";

// 특정 예약에 매인 메일이 아니라 손님에게 곧장 나가는 메일이라, 그
// 시점에 값을 알 수 있는 변수만 골라 쓸 수 있게 한다 — 나머지(상품명·
// 일시 등)는 채울 예약이 없어 빈 채로 나간다.
const AVAILABLE_VARIABLE_KEYS = new Set(["이름", "연락처", "계좌", "공지"]);

type SelectedCustomer = { phone: string; name: string; email: string | null };

/**
 * 고객DB에서 체크박스로 고른 손님들에게 메일을 보낸다. "이메일" 페이지에
 * 이미 만들어둔 규칙(프리셋)을 드롭다운으로 고르면 그 내용 그대로,
 * "직접입력"을 고르면 규칙 모달(rule-modal.tsx)과 같은 서식 에디터로
 * 그 자리에서 제목·본문·CTA 버튼을 써서 보낸다.
 */
export function SendCustomerEmailButton({
  customers,
  rules,
  siteVariables,
  onSent,
}: {
  customers: SelectedCustomer[];
  rules: EmailRule[];
  siteVariables: Record<string, string>;
  onSent: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<
    SendCustomerEmailState,
    FormData
  >(sendCustomerEmails, initialState);

  const [selectedValue, setSelectedValue] = useState<string>(CUSTOM_VALUE);
  const [subject, setSubject] = useState("");
  const [ctas, setCtas] = useState<CtaButton[]>([]);
  const [body, setBody] = useState(toEditorHtml(""));
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<Editor | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");
  const [epoch, setEpoch] = useState(0);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);

  const withEmail = customers.filter((c) => c.email);
  const extraCount = extraEmails.filter((e) => e.trim()).length;
  const withoutEmailCount = customers.length - withEmail.length;
  const isCustom = selectedValue === CUSTOM_VALUE;
  const selectedRule = !isCustom
    ? rules.find((r) => r.id === selectedValue)
    : undefined;

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
      onSent();
    }
  }, [state, onSent]);

  function open() {
    setSelectedValue(rules.length > 0 ? rules[0].id : CUSTOM_VALUE);
    setSubject("");
    setBody(toEditorHtml(""));
    setCtas([]);
    setExtraEmails([]);
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

  const previewCustomer = withEmail[0] ?? customers[0];
  const previewValues = {
    이름: previewCustomer?.name ?? "김철수",
    연락처: previewCustomer?.phone ?? "01012345678",
    ...siteVariables,
  };

  const previewSubject = isCustom ? subject : selectedRule?.subject ?? "";
  const previewBodySource = isCustom ? body : toEditorHtml(selectedRule?.body ?? "");
  const previewCtas = isCustom ? ctas : selectedRule?.ctas ?? [];

  const previewHtml = finalizeEmailHtml(
    renderEmailHtml(previewBodySource, previewValues),
    { ctas: previewCtas },
  );

  useEffect(() => {
    const doc = previewIframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  return (
    <>
      <Button
        type="button"
        onClick={open}
        disabled={customers.length === 0}
        className="text-xs"
      >
        메일 발송 ({customers.length})
      </Button>

      <dialog
        ref={dialogRef}
        className="email-modal-dialog border-border bg-surface text-foreground rounded-xl border p-0 backdrop:bg-black/50"
        style={{ width: "calc(100vw - 2rem)", maxWidth: "64rem", margin: "auto" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">메일 발송</p>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="email-modal-body">
          <form key={epoch} action={action} className="email-modal-form">
            <div className="space-y-4">
              {customers.map((c) => (
                <input key={c.phone} type="hidden" name="phones" value={c.phone} />
              ))}
              <input type="hidden" name="mode" value={isCustom ? "custom" : "preset"} />
              {!isCustom ? (
                <input type="hidden" name="ruleId" value={selectedValue} />
              ) : null}

              <div className="border-border bg-surface-subtle rounded-lg border px-3 py-2 text-xs">
                받는 사람 {withEmail.length + extraCount}명
                {withoutEmailCount > 0
                  ? ` (이메일 주소가 없는 ${withoutEmailCount}명은 자동으로 제외됩니다)`
                  : ""}
              </div>

              <TeamRecipientsField
                heading="받는 사람 직접 추가"
                rowLabel="추가"
                value={extraEmails}
                onChange={setExtraEmails}
                note="고객DB에 없는 주소도 적을 수 있습니다. 이 주소들에는 {{이름}}·{{연락처}}가 빈 칸으로 나갑니다."
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="mailKind">
                  메일 종류
                </label>
                <select
                  id="mailKind"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className={inputClass}
                >
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  <option value={CUSTOM_VALUE}>직접입력</option>
                </select>
              </div>

              {isCustom ? (
                <>
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        CTA 버튼 ({ctas.length}/{MAX_CTA_BUTTONS})
                      </span>
                      {ctas.length < MAX_CTA_BUTTONS ? (
                        <button
                          type="button"
                          onClick={() => setCtas((prev) => [...prev, { text: "", url: "" }])}
                          className="text-brand text-xs font-medium hover:underline"
                        >
                          + 버튼 추가
                        </button>
                      ) : null}
                    </div>

                    {ctas.map((cta, i) => {
                      const [textName, urlName] =
                        i === 0 ? ["ctaText", "ctaUrl"] : [`ctaText${i + 1}`, `ctaUrl${i + 1}`];
                      return (
                        <div key={i} className="border-border space-y-2 rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-muted text-xs font-medium">버튼 {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => setCtas((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-xs text-red-600 hover:underline dark:text-red-400"
                            >
                              삭제
                            </button>
                          </div>
                          <input
                            name={textName}
                            value={cta.text}
                            onChange={(e) =>
                              setCtas((prev) =>
                                prev.map((c, idx) => (idx === i ? { ...c, text: e.target.value } : c)),
                              )
                            }
                            placeholder="버튼 텍스트 (예: 예약 확인하기)"
                            className={inputClass}
                          />
                          <input
                            name={urlName}
                            value={cta.url}
                            onChange={(e) =>
                              setCtas((prev) =>
                                prev.map((c, idx) => (idx === i ? { ...c, url: e.target.value } : c)),
                              )
                            }
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-muted mb-1.5 text-xs font-medium">
                      사용 가능한 변수 (눌러서 커서 위치에 삽입)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {EMAIL_VARIABLES.filter((v) => AVAILABLE_VARIABLE_KEYS.has(v.key)).map(
                        (v) => (
                          <button
                            key={v.key}
                            type="button"
                            title={v.description}
                            onClick={() => insertVariable(v.key)}
                            className="border-border bg-surface-subtle hover:bg-brand hover:text-brand-foreground hover:border-brand rounded-md border px-2 py-1 font-mono text-xs transition-colors"
                          >
                            {`{{${v.key}}}`}
                          </button>
                        ),
                      )}
                    </div>
                    <p className="text-muted mt-1 text-xs">
                      예약에 매인 메일이 아니라 이 네 개만 쓸 수 있습니다.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted border-border rounded-lg border border-dashed p-3 text-xs">
                  &quot;이메일&quot; 페이지에서 만든 내용 그대로 나갑니다. 오른쪽
                  미리보기를 확인한 뒤 발송해 주십시오.
                </p>
              )}
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
              {state.status === "error" ? <ErrorText>{state.error}</ErrorText> : null}
              {state.status === "success" ? (
                <p className="text-xs text-green-700 dark:text-green-400">
                  {state.sent}명에게 발송했습니다
                  {state.skipped > 0 ? ` (이메일 없음 ${state.skipped}명 제외)` : ""}.
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={close}>
                  취소
                </Button>
                <SubmitButton disabled={pending || withEmail.length === 0}>
                  {pending ? "발송 중…" : "발송"}
                </SubmitButton>
              </div>
            </div>
          </form>

          <div className="email-modal-preview border-border">
            <p className="text-muted mb-2 text-xs font-medium">
              미리보기 — {previewCustomer ? `${previewCustomer.name}님 기준` : "예시"} (
              {"{{이름}}"}/{"{{연락처}}"}/{"{{계좌}}"}/{"{{공지}}"} 외 변수는 빈 값)
            </p>
            <div className="border-border bg-surface-subtle mb-2 rounded-lg border px-3 py-2 text-sm">
              <p className="text-muted text-xs">제목</p>
              <p className="font-medium leading-snug">
                {renderEmailTemplate(previewSubject, previewValues)}
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
