"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  previewStatusChangeEmails,
  type EmailPreviewItem,
  type TransitionActionState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { EmailTriggerType } from "@/lib/notifications/email-rules-shared";

type EditedEmail = { subject: string; body: string };

/**
 * 상태를 바꾸는 모든 동작(일정확정/입금확인/완료/노쇼/취소/후보확정)이
 * 공통으로 거치는 확인모달. 열리는 순간 그 트리거에 걸린 이메일
 * 규칙들을 실제 예약 데이터로 렌더링해 보여주고, 관리자가 그 자리에서
 * 고칠 수 있다("확인"을 눌러야 그 내용 그대로 나간다 — 규칙 자체는
 * 안 바뀐다). 취소처럼 사유가 꼭 필요한 동작은 사유 칸이 먼저 있고,
 * 그 사유가 바뀌면(포커스를 벗어나면) {{취소사유}}가 반영되도록
 * 미리보기를 다시 불러온다.
 */
export function StatusTransitionModal({
  reservationId,
  triggerType,
  buttonLabel,
  buttonVariant = "ghost",
  buttonClassName = "",
  modalTitle,
  requireReason,
  confirmAction,
  extraFields,
  extraPreviewVariables,
}: {
  reservationId: string;
  triggerType: EmailTriggerType;
  buttonLabel: string;
  buttonVariant?: "primary" | "ghost" | "danger";
  buttonClassName?: string;
  modalTitle: string;
  /** true면 "취소사유" 입력칸을 먼저 보여주고, 비어있으면 확인을 막는다. */
  requireReason?: boolean;
  confirmAction: (
    prev: TransitionActionState,
    formData: FormData,
  ) => Promise<TransitionActionState>;
  /** 이 동작마다 다른 값(예: nextStatus="payment_confirmed", rank="1"). */
  extraFields?: Record<string, string>;
  /** 미리보기 변수 강제 지정(예: 후보 확정은 아직 예약에 shoot_start가
   * 없어 {{일시}}가 비어 보이므로, 고른 후보 시간을 여기로 넘긴다). */
  extraPreviewVariables?: Record<string, string>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<EmailPreviewItem[] | null>(null);
  const [edited, setEdited] = useState<Record<string, EditedEmail>>({});
  const [loading, setLoading] = useState(false);

  const [state, action, pending] = useActionState<
    TransitionActionState,
    FormData
  >(confirmAction, null);

  useEffect(() => {
    if (state && !state.error) {
      dialogRef.current?.close();
    }
  }, [state]);

  async function loadPreview(reasonValue: string) {
    setLoading(true);
    const result = await previewStatusChangeEmails(reservationId, triggerType, {
      ...extraPreviewVariables,
      ...(requireReason ? { 취소사유: reasonValue } : null),
    });
    setItems(result);
    setEdited(
      Object.fromEntries(
        result.map((item) => [item.ruleId, { subject: item.subject, body: item.body }]),
      ),
    );
    setLoading(false);
  }

  function open() {
    setReason("");
    setItems(null);
    setEdited({});
    void loadPreview("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const overridesJson = JSON.stringify(edited);
  const reasonMissing = Boolean(requireReason) && reason.trim() === "";

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        className={buttonClassName}
        onClick={open}
      >
        {buttonLabel}
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-lg rounded-xl border p-0 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">{modalTitle}</p>
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
          action={action}
          className="max-h-[75vh] space-y-4 overflow-y-auto p-5"
        >
          <input type="hidden" name="id" value={reservationId} />
          {extraFields
            ? Object.entries(extraFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))
            : null}
          {requireReason ? (
            <input type="hidden" name="cancelReason" value={reason} />
          ) : null}
          <input type="hidden" name="overrides" value={overridesJson} />

          {requireReason ? (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="cancelReasonInput"
              >
                취소 사유 <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                id="cancelReasonInput"
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => {
                  // 다시 불러오면 본문에 직접 고친 내용이 지워지므로,
                  // 사유가 실제로 들어가는 규칙이 있을 때만 새로 불러온다.
                  if (items?.some((item) => item.usesCancelReason)) {
                    void loadPreview(reason);
                  }
                }}
                placeholder="예: 고객 요청, 일정 중복 등"
                className={inputClass}
              />
            </div>
          ) : null}

          <div>
            <p className="text-muted mb-1.5 text-xs font-medium">
              이 상태로 바뀌면 나갈 이메일{" "}
              {requireReason ? "(사유 입력 후 아래 내용이 갱신됩니다)" : null}
            </p>

            {loading ? (
              <p className="text-muted text-sm">불러오는 중…</p>
            ) : !items || items.length === 0 ? (
              <p className="border-border bg-surface-subtle text-muted rounded-lg border p-3 text-sm">
                이 상태 전환에 대한 이메일 규칙이 없어, 상태만 바뀌고 이메일은
                나가지 않습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.ruleId}
                    className="border-border rounded-lg border p-3"
                  >
                    <p className="text-muted mb-2 text-xs font-medium">
                      {item.recipientLabel}에게
                    </p>
                    {requireReason && !item.usesCancelReason ? (
                      <p className="mb-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        이 메일 규칙에는 {"{{취소사유}}"}가 없어 사유가 메일에
                        들어가지 않습니다. 넣으려면 아래 본문에 직접 쓰시거나,
                        이메일 메뉴에서 이 규칙에 {"{{취소사유}}"}를 추가해 주세요.
                      </p>
                    ) : null}
                    <input
                      value={edited[item.ruleId]?.subject ?? item.subject}
                      onChange={(e) =>
                        setEdited((prev) => ({
                          ...prev,
                          [item.ruleId]: {
                            subject: e.target.value,
                            body: prev[item.ruleId]?.body ?? item.body,
                          },
                        }))
                      }
                      className={`${inputClass} mb-2`}
                    />
                    <textarea
                      rows={6}
                      value={edited[item.ruleId]?.body ?? item.body}
                      onChange={(e) =>
                        setEdited((prev) => ({
                          ...prev,
                          [item.ruleId]: {
                            subject: prev[item.ruleId]?.subject ?? item.subject,
                            body: e.target.value,
                          },
                        }))
                      }
                      className={`${inputClass} font-mono text-xs leading-relaxed`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <ErrorText>{state?.error ?? null}</ErrorText>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton disabled={pending || loading || reasonMissing}>
              {pending ? "처리 중…" : "확인"}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
