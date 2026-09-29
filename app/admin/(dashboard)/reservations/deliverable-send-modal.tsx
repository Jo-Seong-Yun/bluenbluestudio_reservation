"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  previewStatusChangeEmails,
  sendDeliverableEmail,
  type EmailPreviewItem,
  type SendDeliverableState,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  GoogleDrivePickerButton,
  type DrivePickResult,
} from "@/components/google-drive-picker-button";

type EditedEmail = { subject: string; body: string };

const initialState: SendDeliverableState = { status: "idle" };

/**
 * "결과물 전송" 버튼. status-transition-modal.tsx와 같은 확인+수정
 * 흐름(열리는 순간 이메일 미리보기를 불러오고, 관리자가 고칠 수 있다)을
 * 쓰되, 예약 상태는 바꾸지 않고 구글 드라이브에서 고른 파일/폴더 링크를
 * {{결과물링크}}로 채워 보낸다는 점이 다르다 — 그래서 상태 전환용
 * 컴포넌트를 억지로 재사용하는 대신 따로 둔다.
 */
export function DeliverableSendModal({
  reservationId,
}: {
  reservationId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState<DrivePickResult | null>(null);
  const [items, setItems] = useState<EmailPreviewItem[] | null>(null);
  const [edited, setEdited] = useState<Record<string, EditedEmail>>({});
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  const [state, action, pending] = useActionState<
    SendDeliverableState,
    FormData
  >(sendDeliverableEmail, initialState);

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
    }
  }, [state]);

  async function loadPreview(deliverableUrl: string) {
    setLoading(true);
    const result = await previewStatusChangeEmails(
      reservationId,
      "on_deliverable_sent",
      { 결과물링크: deliverableUrl },
    );
    setItems(result);
    setEdited(
      Object.fromEntries(
        result.map((item) => [item.ruleId, { subject: item.subject, body: item.body }]),
      ),
    );
    setPreviewVersion((n) => n + 1);
    setLoading(false);
  }

  function open() {
    setPicked(null);
    setItems(null);
    setEdited({});
    void loadPreview("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handlePick(result: DrivePickResult) {
    setPicked(result);
    void loadPreview(result.url);
  }

  const overridesJson = JSON.stringify(edited);
  const noRules = items !== null && items.length === 0;

  return (
    <>
      <Button type="button" variant="ghost" onClick={open}>
        결과물 전송
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-2xl rounded-xl border p-0 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">결과물 전송</p>
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
          <input type="hidden" name="deliverableUrl" value={picked?.url ?? ""} />
          <input type="hidden" name="overrides" value={overridesJson} />

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              전달할 결과물{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <GoogleDrivePickerButton onPick={handlePick} />
              {picked ? (
                <span className="border-border bg-surface-subtle inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm">
                  {picked.isFolder ? "📁" : "📄"}
                  <span className="truncate">{picked.name}</span>
                </span>
              ) : (
                <span className="text-muted text-xs">
                  선택한 파일/폴더가 없습니다.
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-muted mb-1.5 text-xs font-medium">
              보낼 이메일 (링크를 선택하면 {"{{"}결과물링크{"}}"}가 자동으로
              채워집니다)
            </p>

            {loading ? (
              <p className="text-muted text-sm">불러오는 중…</p>
            ) : !items || items.length === 0 ? (
              <p className="border-border bg-surface-subtle text-muted rounded-lg border p-3 text-sm">
                &quot;결과물 전송 시&quot; 트리거에 걸린 이메일 규칙이 없어,
                메일이 나가지 않습니다. 이메일 메뉴에서 규칙을 먼저
                만들어 주시기 바랍니다.
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
                    <RichTextEditor
                      key={`${item.ruleId}-${previewVersion}`}
                      initial={item.body}
                      heightClass="h-[260px]"
                      onChange={(html) =>
                        setEdited((prev) => ({
                          ...prev,
                          [item.ruleId]: {
                            subject: prev[item.ruleId]?.subject ?? item.subject,
                            body: html,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <ErrorText>
            {state.status === "error" ? state.error : null}
          </ErrorText>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton disabled={pending || loading || !picked || noRules}>
              {pending ? "전송 중…" : "확인"}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
