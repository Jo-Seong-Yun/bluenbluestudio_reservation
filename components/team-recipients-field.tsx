"use client";

import type { EmailRecipient } from "@/lib/notifications/email-rules-shared";
import {
  MAX_TEAM_EMAILS,
  TEAM_EMAILS_FIELD,
  TEAM_EMAILS_PRESENT_FIELD,
} from "@/lib/notifications/team-emails";

/**
 * 이메일 미리보기 카드의 "발송 대상" 한 줄. 손님이 받는 규칙이면 적어둔
 * 팀원 주소까지 함께 보여줘서, 확인을 누르기 전에 실제로 누구누구에게
 * 나가는지 눈으로 확인할 수 있게 한다. 주소가 없는 쪽은 "이메일 없음".
 */
export function recipientSummary(
  recipients: readonly EmailRecipient[],
  emails: {
    customerEmail: string | null;
    adminEmail: string | null;
    teamEmails: readonly string[];
  },
): string {
  const team = emails.teamEmails.map((e) => e.trim()).filter(Boolean);
  return recipients
    .map((r) => {
      if (r === "admin") return `사장님: ${emails.adminEmail || "이메일 없음"}`;
      const customer = `손님: ${emails.customerEmail || "이메일 없음"}`;
      return team.length > 0 ? `${customer} · 팀원: ${team.join(", ")}` : customer;
    })
    .join(" · ");
}

/**
 * 메일을 받을 사람 목록. 1번(예약자)은 정해진 주소를 보여주기만 하고,
 * 2번부터는 사장님이 직접 적는 팀원 칸이다. 칸은 [+ 팀원 추가]로 늘리고
 * ✕로 지운다. 비워둔 칸은 보내지 않는다. 적은 팀원 주소는 예약에
 * 저장되어 다음 확인창과 자동 메일(리마인드 등)에도 쓰인다.
 */
export function TeamRecipientsField({
  heading = "받는 사람",
  customerLabel = "예약자",
  customerEmail,
  rowLabel = "팀원",
  value,
  onChange,
  note = "비워둔 칸은 보내지 않습니다. 적은 팀원 주소는 이 예약에 저장되어, 이후 손님에게 가는 메일(리마인드 포함)도 각자에게 따로 발송됩니다.",
}: {
  heading?: string;
  customerLabel?: string;
  /** 1번 줄에 보여줄 예약자 주소. 없으면 줄 자체를 숨긴다(undefined). */
  customerEmail?: string | null;
  /** 직접 적는 줄의 이름(기본 "팀원"). */
  rowLabel?: string;
  value: string[];
  onChange: (next: string[]) => void;
  note?: string;
}) {
  const canAdd = value.length < MAX_TEAM_EMAILS;
  const offset = customerEmail === undefined ? 1 : 2;

  return (
    <div>
      <input type="hidden" name={TEAM_EMAILS_PRESENT_FIELD} value="1" />
      <p className="mb-1.5 text-sm font-medium">{heading}</p>
      <ol className="border-border divide-border divide-y rounded-lg border">
        {customerEmail !== undefined ? (
          <li className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-muted w-16 shrink-0 text-xs font-medium">
              1 · {customerLabel}
            </span>
            <span
              className={`min-w-0 flex-1 truncate font-mono text-sm ${customerEmail ? "" : "text-red-600 dark:text-red-400"}`}
            >
              {customerEmail || "이메일 없음"}
            </span>
            <span className="text-muted shrink-0 text-[11px]">자동</span>
          </li>
        ) : null}
        {value.map((email, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2">
            <label
              htmlFor={`teamEmail-${i}`}
              className="text-muted w-16 shrink-0 text-xs font-medium"
            >
              {i + offset} · {rowLabel}
            </label>
            <input
              id={`teamEmail-${i}`}
              name={TEAM_EMAILS_FIELD}
              type="email"
              value={email}
              onChange={(e) =>
                onChange(value.map((v, j) => (j === i ? e.target.value : v)))
              }
              placeholder="이메일 주소"
              className="border-border bg-surface focus:border-brand focus:ring-brand/30 min-w-0 flex-1 rounded-md border px-2.5 py-1.5 font-mono text-sm outline-none placeholder:font-sans focus:ring-2"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`${i + offset}번 ${rowLabel} 칸 삭제`}
              className="text-muted hover:text-foreground shrink-0 px-1 text-base leading-none"
            >
              ✕
            </button>
          </li>
        ))}
        <li className="px-3 py-2">
          <button
            type="button"
            onClick={() => onChange([...value, ""])}
            disabled={!canAdd}
            className="text-brand text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {rowLabel} 추가
          </button>
          {!canAdd ? (
            <span className="text-muted ml-2 text-xs">
              최대 {MAX_TEAM_EMAILS}명까지 추가할 수 있습니다.
            </span>
          ) : null}
        </li>
      </ol>
      {note ? <p className="text-muted mt-1.5 text-xs">{note}</p> : null}
    </div>
  );
}
