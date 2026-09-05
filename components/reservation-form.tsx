"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createReservation,
  type ReservationActionState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialState: ReservationActionState = { status: "idle" };

/**
 * 신청서 작성 페이지 본문. 날짜·시간은 이미 정해진 채로 이 페이지에
 * 들어오므로(URL에 박혀 있다), 여기서는 예약자 정보만 받는다.
 */
export function ReservationForm({
  productId,
  productName,
  durationMin,
  bufferAfterMin,
  date,
  time,
  dateLabel,
  backHref,
  bankAccount,
  notice,
}: {
  productId: string;
  productName: string;
  durationMin: number;
  bufferAfterMin: number;
  date: string;
  time: string;
  dateLabel: string;
  backHref: string;
  bankAccount: string | null;
  notice: string | null;
}) {
  const boundAction = createReservation.bind(
    null,
    productId,
    productName,
    durationMin,
    bufferAfterMin,
  );
  const [state, action, pending] = useActionState(boundAction, initialState);

  if (state.status === "success") {
    return (
      <div className="border-border bg-surface mt-8 rounded-xl border p-6">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          예약 신청이 접수됐어요
        </p>
        <p className="mt-3 text-2xl font-bold tracking-wide">{state.code}</p>
        <p className="text-muted mt-1 text-sm">
          예약 내역은 입력하신 연락처로 언제든 다시 조회할 수 있어요.
        </p>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">상품</dt>
            <dd>{productName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">일시</dt>
            <dd>
              {state.dateLabel} {state.timeLabel}
            </dd>
          </div>
        </dl>

        {bankAccount ? (
          <div className="border-border bg-surface-subtle mt-4 rounded-lg border p-3 text-sm">
            <p className="font-medium">입금 계좌</p>
            <p className="text-muted mt-0.5">{bankAccount}</p>
          </div>
        ) : null}

        {notice ? <p className="text-muted mt-4 text-sm">{notice}</p> : null}

        <Link
          href="/booking/lookup"
          className="text-brand mt-6 inline-block text-sm hover:underline"
        >
          예약 조회하러 가기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface mt-8 rounded-xl border p-5">
      <Link href={backHref} className="text-muted text-sm hover:underline">
        ← 날짜·시간 다시 고르기
      </Link>

      <h1 className="mt-2 text-xl font-bold">신청 내용 작성</h1>
      <p className="text-muted mt-1 text-sm">
        {productName} · {dateLabel} {time}
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

        <Field label="이름">
          <input
            name="customerName"
            required
            maxLength={50}
            className={inputClass}
          />
        </Field>

        <Field label="연락처" hint="예약 조회할 때 필요해요. 숫자만 입력">
          <input
            name="customerPhone"
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            required
            className={inputClass}
          />
        </Field>

        <Field label="인원 (선택)">
          <input
            name="peopleCount"
            type="number"
            min={1}
            className={inputClass}
          />
        </Field>

        <Field label="요청사항 (선택)">
          <textarea
            name="memo"
            rows={3}
            maxLength={500}
            className={inputClass}
          />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="agreePrivacy"
            required
            className="mt-0.5 h-4 w-4"
          />
          <span>
            예약 확인을 위해 이름과 연락처를 수집합니다. 촬영일로부터 1년간 보관
            후 삭제하며, 예약 외 다른 목적으로 쓰지 않습니다.
            <br />
            <span className="font-medium">동의합니다.</span>
          </span>
        </label>

        <ErrorText>{state.status === "error" ? state.error : null}</ErrorText>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "접수 중…" : "예약 신청"}
        </Button>
      </form>
    </div>
  );
}
