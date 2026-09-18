"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

const PRIMARY_CTA_CLASS = "h-[3.375rem] w-full text-base";

/** 계좌번호를 눌러서 바로 복사 — 모바일로 예약하는 손님이 은행 앱으로 바로 넘어가 붙여넣기만 하면 되게 한다. */
function CopyBankAccountButton({ bankAccount }: { bankAccount: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 API를 쓸 수 없는 환경(구형 브라우저 등) — 조용히 무시.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="border-border text-foreground shrink-0 rounded-md border px-2 py-1 text-xs font-medium active:scale-95"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

/**
 * 예약 신청 완료 화면. 손님용 신청서(reservation-form.tsx)와 관리자
 * 설정 화면의 미리보기(settings/reservation-success-preview.tsx)가
 * 이 컴포넌트 하나를 그대로 같이 쓴다 — 미리보기가 실제 화면과
 * 조금이라도 다르게 보이면 미리보기의 의미가 없으므로, 마크업을
 * 두 군데서 따로 관리하지 않는다.
 *
 * interactive=false면(미리보기 용도) 버튼이 실제로 어디로 이동하지
 * 않는, 그냥 모양만 같은 장식으로 바뀐다.
 */
export function ReservationSuccessCard({
  successHeading,
  successMessage,
  code,
  productName,
  candidates,
  bankAccount,
  notice,
  interactive = true,
  animate = true,
}: {
  successHeading: string;
  successMessage: string;
  code: string;
  productName: string;
  candidates: { dateLabel: string; timeLabel: string }[];
  bankAccount: string | null;
  notice: string | null;
  interactive?: boolean;
  /** 미리보기에서는 매 입력마다 다시 재생되면 산만하니 끈다. */
  animate?: boolean;
}) {
  return (
    <div
      className={`border-border bg-surface rounded-xl border p-6 ${animate ? "animate-fade-up" : ""}`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 ${animate ? "animate-check-pop" : ""}`}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 text-emerald-700 dark:text-emerald-400"
          aria-hidden
        >
          <path
            d="M4 10.5l3.5 3.5L16 5.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        {successHeading || " "}
      </p>
      <p className="mt-3 text-2xl font-bold tracking-wide">{code}</p>
      <p className="text-muted mt-1 text-sm">{successMessage || " "}</p>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted w-16 shrink-0">상품</dt>
          <dd>{productName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted w-16 shrink-0">희망시간</dt>
          <dd>
            <ul className="space-y-0.5">
              {candidates.map((c, i) => (
                <li key={i}>
                  {i + 1}지망 · {c.dateLabel} {c.timeLabel}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {bankAccount ? (
        <div className="border-border bg-surface-subtle mt-4 rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">입금 계좌</p>
            <CopyBankAccountButton bankAccount={bankAccount} />
          </div>
          <p className="text-muted mt-0.5">{bankAccount}</p>
        </div>
      ) : null}

      {notice ? <p className="text-muted mt-4 text-sm">{notice}</p> : null}

      {interactive ? (
        <>
          <Link href="/booking" className="mt-6 block">
            <Button type="button" className={PRIMARY_CTA_CLASS}>
              확인
            </Button>
          </Link>
          <Link href="/booking/lookup" className="mt-3 block">
            <Button type="button" variant="ghost" className="w-full">
              예약 조회하러 가기 →
            </Button>
          </Link>
        </>
      ) : (
        <>
          <div className={`${PRIMARY_CTA_CLASS} pointer-events-none mt-6`}>
            <Button type="button" className="h-full w-full" tabIndex={-1}>
              확인
            </Button>
          </div>
          <div className="pointer-events-none mt-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              tabIndex={-1}
            >
              예약 조회하러 가기 →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
