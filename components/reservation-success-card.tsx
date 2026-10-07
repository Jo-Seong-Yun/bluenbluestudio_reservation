"use client";
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
      <h1>{successHeading}</h1>
      <p className="booking-lead">{successMessage}</p>
      <div className="booking-unified-card">
        <section className="booking-price-section">
          <span className="booking-sale">일정 확인 대기</span>
          <p className="booking-small-copy">예약번호</p>
          <div className="booking-code-row">
            <strong>{code}</strong>
            {interactive ? <CopyButton value={code} /> : null}
          </div>
          <p className="booking-small-copy">
            예약번호를 저장해 두시면 조회할 때 편리합니다.
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
          <h2>신청한 희망 시간</h2>
          <ul className="booking-complete-times">
            {candidates.map((c, i) => (
              <li key={i}>
                <small>{i + 1}순위</small>
                {c.dateLabel} · {c.timeLabel}
              </li>
            ))}
          </ul>
          <p className="booking-small-copy">
            아직 촬영 일정이 확정된 것은 아닙니다.
          </p>
        </section>
        <section className="booking-process">
          <h2>{copy.nextTitle}</h2>
          <ol>
            {[1, 2].map((n) => (
              <li key={n}>
                <span>0{n}</span>
                <div>
                  <strong>{copy[`next${n}Title`]}</strong>
                  <p>{copy[`next${n}Body`]}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="booking-small-copy">
            <b>확정 안내 전에는 입금하지 않습니다.</b>
            <br />
            예약 조회에서 진행 상태를 확인할 수 있습니다.
          </p>
          {bankAccount ? (
            <div className="booking-bank">
              <p>입금 계좌 · 일정 확정 후 이용합니다</p>
              <div className="booking-code-row">
                <span>{bankAccount}</span>
                {interactive ? <CopyButton value={bankAccount} /> : null}
              </div>
            </div>
          ) : null}
          {notice ? (
            <p className="booking-small-copy whitespace-pre-wrap">{notice}</p>
          ) : null}
        </section>
      </div>
      <div className="booking-primary-dock">
        {interactive ? (
          <Link
            href={`/booking/lookup?code=${encodeURIComponent(code)}`}
            className="booking-primary"
          >
            내 예약 확인하기 →
          </Link>
        ) : (
          <div className="booking-primary">내 예약 확인하기 →</div>
        )}
        <p>예약번호로 신청 내역을 확인할 수 있습니다.</p>
      </div>
    </section>
  );
}
