"use client";
import { depositText } from "@/lib/booking/deposit-content";
import { useState } from "react";
import Link from "next/link";
import { resolveCopy, type BookingCopy } from "@/lib/booking/copy";
function CopyButton({ value }: { value: string }) {
  const [message, setMessage] = useState("복사");
  return (
    <button
      type="button"
      className="booking-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setMessage("복사됨");
        } catch {
          setMessage("직접 복사");
        }
      }}
      aria-label={`${value} 복사`}
    >
      {message}
    </button>
  );
}
export function ReservationSuccessCard({
  successHeading,
  successMessage,
  code,
  productName,
  candidates,
  bankAccount,
  depositRequired = true,
  notice,
  interactive = true,
  animate = true,
  copy: rawCopy,
  estimatedTotal,
  durationMin,
}: {
  successHeading: string;
  successMessage: string;
  code: string;
  productName: string;
  candidates: { dateLabel: string; timeLabel: string }[];
  bankAccount: string | null;
  depositRequired?: boolean;
  notice: string | null;
  interactive?: boolean;
  animate?: boolean;
  copy?: BookingCopy;
  estimatedTotal?: number;
  durationMin?: number;
}) {
  const copy = resolveCopy(rawCopy);
  return (
    <section
      className={`booking-modern-success ${animate ? "animate-fade-up" : ""}`}
    >
      <p className="booking-eyebrow">신청 접수 완료</p>
      <div className="booking-success-check" aria-hidden>
        ✓
      </div>
      <h1>
        <span data-preview-target="copy:successTitle">{successHeading}</span>
      </h1>
      <p className="booking-lead">
        <span data-preview-target="copy:successIntro">
          {depositText(successMessage, depositRequired, bankAccount)}
        </span>
      </p>
      <div className="booking-unified-card">
        <section className="booking-price-section">
          <span className="booking-sale">일정 확인 대기</span>
          <p className="booking-small-copy">예약번호</p>
          <div className="booking-code-row">
            <strong>{code}</strong>
            {interactive ? <CopyButton value={code} /> : null}
          </div>
          <p className="booking-small-copy booking-close-note">
            <span data-preview-target="copy:successCodeNote">
              {copy.successCodeNote}
            </span>
          </p>
        </section>
        <section className="booking-process">
          <h2>{productName}</h2>
          {durationMin ? (
            <p className="booking-small-copy">촬영 {durationMin}분</p>
          ) : null}
          {estimatedTotal !== undefined ? (
            <div className="booking-summary-total">
              <span>예상 금액</span>
              <strong>{estimatedTotal.toLocaleString()}원</strong>
            </div>
          ) : null}
        </section>
        <section className="booking-process">
          <h2>
            <span data-preview-target="copy:successTimesTitle">
              {copy.successTimesTitle}
            </span>
          </h2>
          <ul className="booking-complete-times">
            {candidates.map((c, i) => (
              <li key={i}>
                <small>{i + 1}순위</small>
                {c.dateLabel} · {c.timeLabel}
              </li>
            ))}
          </ul>
          <p className="booking-small-copy">
            <span data-preview-target="copy:successTimesNote">
              {copy.successTimesNote}
            </span>
          </p>
        </section>
        <section className="booking-process">
          <h2>
            <span data-preview-target="copy:nextTitle">{copy.nextTitle}</span>
          </h2>
          <ol>
            {[1, 2].map((n) => (
              <li key={n}>
                <span>0{n}</span>
                <div>
                  <strong>
                    <span data-preview-target={`copy:next${n}Title`}>
                      {copy[`next${n}Title`]}
                    </span>
                  </strong>
                  <p>
                    <span data-preview-target={`copy:next${n}Body`}>
                      {copy[`next${n}Body`]}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {depositRequired ? (
            <p className="booking-small-copy">
              <b>확정 안내 전에는 입금하지 않습니다.</b>
            </p>
          ) : null}
          {depositRequired && bankAccount ? (
            <div className="booking-bank">
              <p>입금 계좌 · 일정 확정 후 이용합니다</p>
              <div className="booking-code-row">
                <span>{bankAccount}</span>
                {interactive ? <CopyButton value={bankAccount} /> : null}
              </div>
            </div>
          ) : null}
          {copy.nextNote ? (
            <p className="booking-small-copy">
              <span data-preview-target="copy:nextNote">{copy.nextNote}</span>
            </p>
          ) : null}
          {notice ? (
            <p className="booking-small-copy whitespace-pre-wrap">
              {depositText(notice, depositRequired, bankAccount)}
            </p>
          ) : null}
        </section>
      </div>
      <div className="booking-primary-dock">
        {interactive ? (
          <Link
            href={`/booking/lookup?code=${encodeURIComponent(code)}`}
            className="booking-primary"
          >
            <span data-preview-target="copy:successButton">
              {copy.successButton}
            </span>
          </Link>
        ) : (
          <div className="booking-primary">
            <span data-preview-target="copy:successButton">
              {copy.successButton}
            </span>
          </div>
        )}
        <p>
          <span data-preview-target="copy:successButtonNote">
            {copy.successButtonNote}
          </span>
        </p>
      </div>
    </section>
  );
}
