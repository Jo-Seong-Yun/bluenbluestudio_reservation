"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  sendCustomerEmails,
  previewCustomerEmailContexts,
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
import {
  customerEmailValues,
  renderCustomerCtas,
  type CustomerEmailContext,
} from "@/lib/notifications/customer-email-shared";
import { buildEmailVariables } from "@/lib/notifications/templates";
import type { Editor } from "@tiptap/react";

const initialState: SendCustomerEmailState = { status: "idle" };
const CUSTOM_VALUE = "__custom__";

type SelectedCustomer = { phone: string; name: string; email: string | null };

/** 고객DB에서 고른 손님에게 예약 변수와 이번 발송용 편집 내용을 적용합니다.
 * 프리셋도 이메일 페이지와 같은 서식 에디터로 편집하며 원본 규칙은 보존합니다. */
export function SendCustomerEmailButton({
  customers,
  rules,
  siteVariables,
  onSent,
  reservationId,
  buttonLabel,
  autoOpen = false,
  onClosed,
}: {
  customers: SelectedCustomer[];
  rules: EmailRule[];
  siteVariables: Record<string, string>;
  onSent: () => void;
  reservationId?: string;
  buttonLabel?: string;
  autoOpen?: boolean;
  onClosed?: () => void;
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
  const [contexts, setContexts] = useState<CustomerEmailContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewPhone, setPreviewPhone] = useState("");
  const [reservationIds, setReservationIds] = useState<Record<string, string>>(
    {},
  );
  const [variableEdits, setVariableEdits] = useState<
    Record<string, Record<string, string>>
  >({});
  const [editorEpoch, setEditorEpoch] = useState(0);
  const loadVersion = useRef(0);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);

  const withEmail = customers.filter((c) => c.email);
  const extraCount = extraEmails.filter((e) => e.trim()).length;
  const withoutEmailCount = customers.length - withEmail.length;

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
      onSent();
    }
  }, [state, onSent]);

  const autoOpened = useRef(false);


  function selectTemplate(value: string) {
    setSelectedValue(value);
    const rule = rules.find((r) => r.id === value);
    setSubject(rule?.subject ?? "");
    setBody(toEditorHtml(rule?.body ?? ""));
    setCtas(rule?.ctas.map((c) => ({ ...c })) ?? []);
    setEditorEpoch((n) => n + 1);
  }
  async function open() {
    selectTemplate(rules[0]?.id ?? CUSTOM_VALUE);
    setExtraEmails([]);
    setVariableEdits({});
    setContexts([]);
    setLoadError(null);
    setPreviewPhone(withEmail[0]?.phone ?? "");
    setReservationIds({});
    setLoading(true);
    setEpoch((n) => n + 1);
    dialogRef.current?.showModal();
    const version = ++loadVersion.current;
    try {
      const result = await previewCustomerEmailContexts(
        customers.map((c) => c.phone),
      );
      if (version !== loadVersion.current) return;
      if(reservationId && !result.contexts.some(c=>c.reservations.some(r=>r.id===reservationId))) {
        setLoadError("해당 예약을 불러오지 못했습니다. 예약내역을 새로고침해 주세요.");
        return;
      }
      setContexts(result.contexts);
      setLoadError(result.error);
      setReservationIds(
        Object.fromEntries(
          result.contexts.map((c) => [
            c.phone,
            reservationId ?? c.reservations[0]?.id ?? "",
          ]),
        ),
      );
    } catch {
      if (version === loadVersion.current)
        setLoadError("예약 정보를 불러오지 못했습니다.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  function close() {
    ++loadVersion.current;
    dialogRef.current?.close();
  }

  useEffect(() => {
    if (autoOpen && !autoOpened.current) {
      autoOpened.current = true;
      void open();
    }
    // 자동 열기는 마운트 때 한 번만 실행합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

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
    setSubject(
      target.value.slice(0, start) + placeholder + target.value.slice(end),
    );
    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + placeholder.length;
      target.setSelectionRange(cursor, cursor);
    });
  }

  const previewCustomer = customers.find((c) => c.phone === previewPhone);
  const previewContext = contexts.find((c) => c.phone === previewPhone) ?? {
    phone: previewPhone,
    name: previewCustomer?.name ?? "",
    reservations: [],
    variables: {
      ...buildEmailVariables({
        customerName: previewCustomer?.name ?? "",
        customerPhone: previewPhone,
      }),
      ...siteVariables,
    },
  };
  const previewValues = customerEmailValues(
    previewContext,
    reservationIds[previewPhone] ?? "",
    variableEdits[previewPhone] ?? {},
  );
  const previewHtml = finalizeEmailHtml(renderEmailHtml(body, previewValues), {
    ctas: renderCustomerCtas(ctas, previewValues),
  });

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
        className={autoOpen ? "hidden" : "text-xs"}
      >
        {buttonLabel ?? `메일 발송 (${customers.length})`}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={onClosed}
        className="email-modal-dialog border-border bg-surface text-foreground rounded-xl border p-0 backdrop:bg-black/50"
        style={{
          width: "calc(100vw - 2rem)",
          maxWidth: "64rem",
          margin: "auto",
        }}
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
                <input
                  key={c.phone}
                  type="hidden"
                  name="phones"
                  value={c.phone}
                />
              ))}
              <input type="hidden" name="mode" value="custom" />
              {reservationId ? (
                <input
                  type="hidden"
                  name="boundReservationId"
                  value={reservationId}
                />
              ) : null}
              {contexts.map((c) => (
                <input
                  key={`reservation-${c.phone}`}
                  type="hidden"
                  name={`reservation_${c.phone}`}
                  value={reservationIds[c.phone] ?? ""}
                />
              ))}
              {Object.entries(variableEdits).map(([phone, values]) => (
                <input
                  key={`variables-${phone}`}
                  type="hidden"
                  name={`variables_${phone || "extra"}`}
                  value={JSON.stringify(values)}
                />
              ))}

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
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="mailKind"
                >
                  메일 종류
                </label>
                <select
                  id="mailKind"
                  value={selectedValue}
                  onChange={(e) => selectTemplate(e.target.value)}
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

              <p className="text-muted text-xs">
                선택한 메일을 불러와 이번 발송용으로 편집합니다. 저장된 이메일
                규칙은 변경되지 않습니다.
              </p>
              {loading ? (
                <p role="status">고객 예약 정보를 불러오는 중…</p>
              ) : null}
              {loadError ? <ErrorText>{loadError}</ErrorText> : null}
              <div className="border-border space-y-3 rounded-lg border p-3">
                <label className="block text-sm">
                  변수 확인할 수신자
                  <select
                    aria-label="변수 확인할 수신자"
                    value={previewPhone}
                    onChange={(e) => setPreviewPhone(e.target.value)}
                    className={inputClass}
                  >
                    {withEmail.map((c) => (
                      <option key={c.phone} value={c.phone}>
                        {c.name} · {c.email}
                      </option>
                    ))}
                    <option value="">직접 추가한 수신자</option>
                  </select>
                </label>
                {previewPhone ? (
                  <label className="block text-sm">
                    변수에 사용할 예약
                    <select
                      aria-label="변수에 사용할 예약"
                      value={reservationIds[previewPhone] ?? ""}
                      disabled={loading || Boolean(reservationId)}
                      onChange={(e) => {
                        setReservationIds((prev) => ({
                          ...prev,
                          [previewPhone]: e.target.value,
                        }));
                        setVariableEdits((prev) => ({
                          ...prev,
                          [previewPhone]: {},
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">예약 연결 없이 발송</option>
                      {previewContext.reservations.map((r, i) => (
                        <option key={r.id} value={r.id}>
                          {i === 0 ? "최근 신청 · " : ""}
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <p className="text-muted text-xs">
                  고객마다 최근 신청 예약을 기본 연결합니다. 아래 변수 값은 현재
                  선택한 수신자에게만 적용됩니다. 결과물 링크·기존/변경 일시 등
                  기록에 없는 값은 직접 입력해 주세요.
                </p>
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    변수 값 확인·편집
                  </summary>
                  <div className="mt-3 space-y-2">
                    {EMAIL_VARIABLES.map((v) => (
                      <label key={v.key} className="block text-xs">
                        {v.key}
                        <textarea
                          aria-label={`${v.key} 변수 값`}
                          rows={
                            v.key === "추가옵션" || v.key === "후보목록" ? 3 : 1
                          }
                          maxLength={10000}
                          disabled={loading}
                          value={previewValues[v.key] ?? ""}
                          onChange={(e) =>
                            setVariableEdits((prev) => ({
                              ...prev,
                              [previewPhone]: {
                                ...prev[previewPhone],
                                [v.key]: e.target.value,
                              },
                            }))
                          }
                          className={`${inputClass} mt-1`}
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="text-brand text-xs"
                      onClick={() =>
                        setVariableEdits((prev) => ({
                          ...prev,
                          [previewPhone]: {},
                        }))
                      }
                    >
                      예약 정보 값으로 되돌리기
                    </button>
                  </div>
                </details>
              </div>
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
                    key={editorEpoch}
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
                        onClick={() =>
                          setCtas((prev) => [...prev, { text: "", url: "" }])
                        }
                        className="text-brand text-xs font-medium hover:underline"
                      >
                        + 버튼 추가
                      </button>
                    ) : null}
                  </div>

                  {ctas.map((cta, i) => {
                    const [textName, urlName] =
                      i === 0
                        ? ["ctaText", "ctaUrl"]
                        : [`ctaText${i + 1}`, `ctaUrl${i + 1}`];
                    return (
                      <div
                        key={i}
                        className="border-border space-y-2 rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-muted text-xs font-medium">
                            버튼 {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCtas((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
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
                              prev.map((c, idx) =>
                                idx === i ? { ...c, text: e.target.value } : c,
                              ),
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
                              prev.map((c, idx) =>
                                idx === i ? { ...c, url: e.target.value } : c,
                              ),
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
                  <p className="text-muted mt-1 text-xs">
                    고객·예약 정보가 수신자별로 채워집니다. 빈 값은 위에서 직접
                    편집할 수 있습니다.
                  </p>
                </div>
              </>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
              {state.status === "error" ? (
                <ErrorText>{state.error}</ErrorText>
              ) : null}
              {state.status === "success" ? (
                <p className="text-xs text-green-700 dark:text-green-400">
                  {state.sent}명에게 발송했습니다
                  {state.skipped > 0
                    ? ` (이메일 없음 ${state.skipped}명 제외)`
                    : ""}
                  .
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={close}>
                  취소
                </Button>
                <SubmitButton
                  disabled={
                    pending ||
                    loading ||
                    Boolean(loadError) ||
                    (withEmail.length === 0 && extraCount === 0)
                  }
                >
                  {pending ? "발송 중…" : "발송"}
                </SubmitButton>
              </div>
            </div>
          </form>

          <div className="email-modal-preview border-border">
            <p className="text-muted mb-2 text-xs font-medium">
              미리보기 —{" "}
              {previewCustomer
                ? `${previewCustomer.name}님 기준`
                : "직접 추가한 수신자 기준"}
            </p>
            <div className="border-border bg-surface-subtle mb-2 rounded-lg border px-3 py-2 text-sm">
              <p className="text-muted text-xs">제목</p>
              <p className="leading-snug font-medium">
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
