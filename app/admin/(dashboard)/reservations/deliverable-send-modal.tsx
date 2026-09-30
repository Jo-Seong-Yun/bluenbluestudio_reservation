"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  loadDeliverableEmailInfo,
  previewStatusChangeEmails,
  sendDeliverableEmail,
  type DeliverableEmailInfo,
  type EmailPreviewItem,
  type SendDeliverableState,
} from "@/app/admin/actions";
import type { EmailRecipient } from "@/lib/notifications/email-rules-shared";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { RichTextEditor } from "@/components/rich-text-editor";

type EditedEmail = { subject: string; body: string };

const initialState: SendDeliverableState = { status: "idle" };

/**
 * 이메일 카드마다 "누구에게(손님·사장님)"뿐 아니라 실제로 어느 주소로
 * 나가는지도 보여준다 — 손님 주소가 고객DB 우선 규칙으로 정해지므로,
 * 관리자가 확인모달에서 눈으로 확인할 수 있어야 한다. 주소가 없는
 * 수신자는 "(이메일 없음)"으로 표시해 그 사람에게는 실제로 메일이
 * 안 나간다는 걸 알린다.
 */
function recipientAddressesText(
  recipients: EmailRecipient[],
  emailInfo: DeliverableEmailInfo | null,
  extraEmails: string[],
): string {
  const extras = extraEmails.map((e) => e.trim()).filter(Boolean);
  return recipients
    .map((r) => {
      if (r === "admin") return `사장님: ${emailInfo?.adminEmail || "이메일 없음"}`;
      const customer = `손님: ${emailInfo?.sendTo || "이메일 없음"}`;
      return extras.length > 0 ? `${customer}, ${extras.join(", ")}` : customer;
    })
    .join(" · ");
}

/** 최대 인원이 2명 이상인 상품이면 예약자를 뺀 나머지 인원 수. 그 외엔 0. */
export function extraRecipientCount(productMaxPeople: number | null): number {
  return productMaxPeople && productMaxPeople > 1 ? productMaxPeople - 1 : 0;
}

/**
 * 결과물을 받을 사람 목록. 1번(예약자)은 고객DB/예약건에서 정해진
 * 주소를 그대로 보여주기만 하고, 2번부터는 사장님이 직접 적는다 —
 * 칸 수는 상품관리의 "최대 인원"에서 예약자 1명을 뺀 만큼이다.
 * 비워둔 칸은 보내지 않는다.
 */
export function DeliverableRecipients({
  sendTo,
  extraEmails,
  onChangeExtra,
}: {
  sendTo: string | null;
  extraEmails: string[];
  onChangeExtra: (index: number, value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">받는 사람</p>
      <ol className="border-border divide-border divide-y rounded-lg border">
        <li className="flex items-center gap-3 px-3 py-2.5">
          <span className="text-muted w-16 shrink-0 text-xs font-medium">
            1 · 예약자
          </span>
          <span
            className={`min-w-0 flex-1 truncate font-mono text-sm ${sendTo ? "" : "text-red-600 dark:text-red-400"}`}
          >
            {sendTo || "이메일 없음"}
          </span>
          <span className="text-muted shrink-0 text-[11px]">자동</span>
        </li>
        {extraEmails.map((value, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2">
            <label
              htmlFor={`extraEmail-${i}`}
              className="text-muted w-16 shrink-0 text-xs font-medium"
            >
              {i + 2} · 동반인
            </label>
            <input
              id={`extraEmail-${i}`}
              name="extraEmails"
              type="email"
              value={value}
              onChange={(e) => onChangeExtra(i, e.target.value)}
              placeholder="이메일 주소 (비워두면 보내지 않음)"
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 min-w-0 flex-1 rounded-md border px-2.5 py-1.5 font-mono text-sm outline-none placeholder:font-sans focus:ring-2"
            />
          </li>
        ))}
      </ol>
      {extraEmails.length > 0 ? (
        <p className="text-muted mt-1.5 text-xs">
          최대 {extraEmails.length + 1}명 상품이라 예약자 외{" "}
          {extraEmails.length}명의 이메일을 더 적을 수 있습니다. 같은
          내용의 메일이 함께 발송됩니다.
        </p>
      ) : null}
    </div>
  );
}

/**
 * "결과물 전송" 버튼. status-transition-modal.tsx와 같은 확인+수정
 * 흐름(열리는 순간 이메일 미리보기를 불러오고, 관리자가 고칠 수 있다)을
 * 쓰되, 예약 상태는 바꾸지 않고 구글 드라이브에서 고른 파일/폴더 링크를
 * {{결과물링크}}로 채워 보낸다는 점이 다르다 — 그래서 상태 전환용
 * 컴포넌트를 억지로 재사용하는 대신 따로 둔다.
 */
export function DeliverableSendModal({
  reservationId,
  buttonClassName = "",
}: {
  reservationId: string;
  /** 이 버튼을 다른 버튼들과 크기·모양을 맞춰야 하는 자리(예약내역
   * 표의 버튼 열)에서 넘긴다. */
  buttonClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [items, setItems] = useState<EmailPreviewItem[] | null>(null);
  const [edited, setEdited] = useState<Record<string, EditedEmail>>({});
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [emailInfo, setEmailInfo] = useState<DeliverableEmailInfo | null>(null);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);

  const [state, action, pending] = useActionState<
    SendDeliverableState,
    FormData
  >(sendDeliverableEmail, initialState);

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
    }
  }, [state]);

  async function loadPreview(url: string) {
    setLoading(true);
    const result = await previewStatusChangeEmails(
      reservationId,
      "on_deliverable_sent",
      { 결과물링크: url },
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
    setDeliverableUrl("");
    setItems(null);
    setEdited({});
    setEmailInfo(null);
    setExtraEmails([]);
    void loadPreview("");
    void loadDeliverableEmailInfo(reservationId).then((info) => {
      setEmailInfo(info);
      setExtraEmails(
        Array.from({ length: extraRecipientCount(info.productMaxPeople) }, () => ""),
      );
    });
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const overridesJson = JSON.stringify(edited);
  const noRules = items !== null && items.length === 0;
  const emailMismatch =
    !!emailInfo?.reservationEmail &&
    !!emailInfo?.customerDbEmail &&
    emailInfo.reservationEmail !== emailInfo.customerDbEmail;
  const noEmailAtAll = emailInfo !== null && !emailInfo.sendTo;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={buttonClassName}
        onClick={open}
      >
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
          <input type="hidden" name="overrides" value={overridesJson} />

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="deliverableUrl"
            >
              전달할 결과물 링크{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="deliverableUrl"
              name="deliverableUrl"
              type="url"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              onBlur={() => void loadPreview(deliverableUrl)}
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>

          {emailMismatch ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              ⚠ 예약건에 입력된 이메일({emailInfo?.reservationEmail})과
              고객DB에 저장된 이메일({emailInfo?.customerDbEmail})이
              다릅니다. 결과물은 고객DB 주소({emailInfo?.customerDbEmail})로
              발송됩니다 — 주소가 맞는지 확인해 주시기 바랍니다.
            </div>
          ) : null}

          {emailInfo ? (
            <DeliverableRecipients
              sendTo={emailInfo.sendTo}
              extraEmails={extraEmails}
              onChangeExtra={(index, value) =>
                setExtraEmails((prev) =>
                  prev.map((v, i) => (i === index ? value : v)),
                )
              }
            />
          ) : null}

          {noEmailAtAll ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              ⚠ 예약건과 고객DB 어디에도 이메일 주소가 없어, 손님에게는
              메일이 나가지 않습니다. 먼저 고객DB나 예약 메모에 이메일을
              채워 주시기 바랍니다.
            </div>
          ) : null}

          <div>
            <p className="text-muted mb-1.5 text-xs font-medium">
              보낼 이메일 (링크를 입력하면 {"{{"}결과물링크{"}}"}가 자동으로
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
                      발송 대상 ·{" "}
                      <span className="font-mono font-normal">
                        {recipientAddressesText(
                          item.recipients,
                          emailInfo,
                          extraEmails,
                        )}
                      </span>
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
            <SubmitButton
              disabled={pending || loading || !deliverableUrl.trim() || noRules}
            >
              {pending ? "전송 중…" : "확인"}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
