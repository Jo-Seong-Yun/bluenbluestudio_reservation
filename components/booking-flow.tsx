"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  createReservation,
  loadSlotsForDate,
  type ReservationActionState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import {
  addMonths,
  monthGridDates,
  weekdayOf,
  type DateString,
} from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const initialReservationState: ReservationActionState = { status: "idle" };

/**
 * 예약 화면 전체(달력 → 시간 → 신청서)를 한 화면에서 이어서 보여준다.
 *
 * 예전엔 날짜 칸이 "그 날짜 페이지"로 가는 링크였다(자바스크립트 없이도
 * 동작하는 게 이 프로젝트의 원칙이었다). 하지만 "달력에서 날짜를 고르면
 * 그 아래로 시간 칸이 생기고, 시간을 고르면 전체가 부드럽게 왼쪽으로
 * 옮겨가며 오른쪽에 신청서가 나타난다"는 흐름은 페이지 이동으로는 만들
 * 수 없다 — 그래서 이 화면만큼은 클라이언트 상태로 전환했다.
 */
export function BookingFlow({
  productId,
  productName,
  durationMin,
  bufferAfterMin,
  month,
  availableDates,
  basePath,
  minMonth,
  maxMonth,
  bankAccount,
  notice,
}: {
  productId: string;
  productName: string;
  durationMin: number;
  bufferAfterMin: number;
  month: string;
  availableDates: DateString[];
  basePath: string;
  minMonth: string;
  maxMonth: string;
  bankAccount: string | null;
  notice: string | null;
}) {
  const availableSet = new Set(availableDates);

  const [selectedDate, setSelectedDate] = useState<DateString | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsPending, startSlotsTransition] = useTransition();

  const boundAction = createReservation.bind(
    null,
    productId,
    productName,
    durationMin,
    bufferAfterMin,
  );
  const [state, action, pending] = useActionState(
    boundAction,
    initialReservationState,
  );

  function handleSelectDate(date: DateString) {
    setSelectedDate(date);
    setSelectedTime(null);
    startSlotsTransition(async () => {
      const result = await loadSlotsForDate(productId, date);
      setSlots(result);
    });
  }

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

  const showForm = Boolean(selectedDate && selectedTime);

  return (
    <div
      className={`mt-8 flex flex-col gap-6 transition-all duration-500 ${
        showForm ? "lg:flex-row lg:items-start" : ""
      }`}
    >
      <div
        className={`transition-all duration-500 ${
          showForm ? "lg:w-[22rem] lg:shrink-0" : "w-full"
        }`}
      >
        <div className="border-border bg-surface rounded-xl border p-4">
          <h2 className="mb-4 font-bold">날짜 선택</h2>
          <CalendarGrid
            month={month}
            availableDates={availableSet}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            basePath={basePath}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />
        </div>

        {/* 날짜를 고르면 이 칸이 아래로 부드럽게 펼쳐진다. */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            selectedDate ? "mt-6 grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-border bg-surface rounded-xl border p-4">
              <h2 className="mb-4 font-bold">시간 선택</h2>
              {slotsPending ? (
                <p className="text-muted text-sm">불러오는 중…</p>
              ) : slots.length === 0 ? (
                <p className="text-muted text-sm">
                  이 날짜는 예약할 수 있는 시간이 없어요.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-lg border py-2 text-center text-sm transition-colors ${
                        selectedTime === time
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface hover:border-brand"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 시간까지 고르면 오른쪽에서 신청서가 나타난다.
          hidden(display:none)을 쓰면 트랜지션이 아예 안 걸리므로,
          너비를 0으로 접는 방식으로 부드럽게 나타나고 사라지게 한다. */}
      <div
        className={`min-w-0 overflow-hidden transition-all duration-500 ${
          showForm ? "flex-1 opacity-100" : "w-0 flex-none opacity-0"
        }`}
      >
        {showForm ? (
          <div className="border-border bg-surface rounded-xl border p-4">
            <h2 className="mb-4 font-bold">신청 내용 작성</h2>
            <p className="text-muted -mt-2 mb-4 text-sm">
              {selectedDate} {selectedTime}
            </p>

            <form action={action} className="space-y-4">
              <input type="hidden" name="date" value={selectedDate ?? ""} />
              <input type="hidden" name="time" value={selectedTime ?? ""} />

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
                  예약 확인을 위해 이름과 연락처를 수집합니다. 촬영일로부터
                  1년간 보관 후 삭제하며, 예약 외 다른 목적으로 쓰지 않습니다.
                  <br />
                  <span className="font-medium">동의합니다.</span>
                </span>
              </label>

              <ErrorText>
                {state.status === "error" ? state.error : null}
              </ErrorText>

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "접수 중…" : "예약 신청"}
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CalendarGrid({
  month,
  availableDates,
  selectedDate,
  onSelectDate,
  basePath,
  minMonth,
  maxMonth,
}: {
  month: string;
  availableDates: Set<DateString>;
  selectedDate: DateString | null;
  onSelectDate: (date: DateString) => void;
  basePath: string;
  minMonth: string;
  maxMonth: string;
}) {
  const grid = monthGridDates(month);
  const [year, m] = month.split("-").map(Number);

  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const canGoPrev = prevMonth >= minMonth;
  const canGoNext = nextMonth <= maxMonth;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <NavLink
          basePath={basePath}
          month={prevMonth}
          disabled={!canGoPrev}
          label="이전 달"
        >
          ←
        </NavLink>
        <p className="font-bold">
          {year}년 {m}월
        </p>
        <NavLink
          basePath={basePath}
          month={nextMonth}
          disabled={!canGoNext}
          label="다음 달"
        >
          →
        </NavLink>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-muted py-1 text-xs font-medium">
            {label}
          </div>
        ))}

        {grid.map((date) => {
          const inMonth = date.startsWith(month);
          const available = inMonth && availableDates.has(date);
          const day = Number(date.slice(8, 10));
          const weekday = weekdayOf(date);
          const isSelected = date === selectedDate;

          const weekdayColor =
            weekday === 0
              ? "text-red-600 dark:text-red-400"
              : weekday === 6
                ? "text-brand"
                : "text-foreground";

          if (!available) {
            return (
              <div
                key={date}
                className={`aspect-square rounded-md text-sm ${
                  inMonth ? `${weekdayColor} opacity-40` : "opacity-0"
                } flex items-center justify-center`}
                aria-hidden={!inMonth}
              >
                {day}
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`aspect-square rounded-md text-sm font-medium transition-colors ${weekdayColor} flex items-center justify-center ${
                isSelected
                  ? "bg-brand text-brand-foreground"
                  : "bg-brand/15 hover:bg-brand hover:text-brand-foreground"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-muted mt-3 text-xs">
        색이 있는 날짜만 예약할 수 있어요.
      </p>
    </div>
  );
}

function NavLink({
  basePath,
  month,
  disabled,
  label,
  children,
}: {
  basePath: string;
  month: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className="text-muted/30 px-2 py-1 text-sm">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`${basePath}?month=${month}`}
      aria-label={label}
      className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
    >
      {children}
    </Link>
  );
}
