"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { loadSlotsForDate } from "@/lib/booking/actions";
import {
  addMonths,
  monthGridDates,
  weekdayOf,
  type DateString,
} from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 달력 → 시간 선택. 날짜를 고르면 그 아래로 시간 칸이 펼쳐진다.
 *
 * 시간까지 고르면(칸을 클릭하면) 곧바로 신청서 페이지
 * (`${basePath}/${date}/${time}`)로 이동한다 — 신청서 작성은 이 화면이
 * 아니라 별도 페이지의 몫이다. 그래서 이 컴포넌트는 달력과 시간
 * 그리드만 다루고, 화면 가운데 하나의 카드로 넉넉하게 자리 잡는다.
 */
export function BookingFlow({
  productId,
  month,
  availableDates,
  basePath,
  minMonth,
  maxMonth,
}: {
  productId: string;
  month: string;
  availableDates: DateString[];
  basePath: string;
  minMonth: string;
  maxMonth: string;
}) {
  const availableSet = new Set(availableDates);

  const [selectedDate, setSelectedDate] = useState<DateString | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsPending, startSlotsTransition] = useTransition();
  const timeSectionRef = useRef<HTMLDivElement>(null);

  function handleSelectDate(date: DateString) {
    setSelectedDate(date);
    startSlotsTransition(async () => {
      const result = await loadSlotsForDate(productId, date);
      setSlots(result);
    });
  }

  // 시간 슬롯이 실제로 도착해 칸이 최종 높이까지 다 펼쳐진 뒤에
  // 화면을 그쪽으로 내린다. 슬롯을 아직 불러오는 중일 때(칸 안이
  // "불러오는 중…" 한 줄뿐이라 낮다) 스크롤해버리면, 그 순간의 낮은
  // 높이를 기준으로 목표 위치가 계산되어 막상 슬롯이 채워지고 나면
  // 화면이 시간 칸 중간에서 멈춰 버튼들이 아래로 잘려 보인다.
  useEffect(() => {
    if (!selectedDate || slotsPending) return;
    const frame = requestAnimationFrame(() => {
      timeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedDate, slotsPending]);

  return (
    <div className="mx-auto mt-8 w-full max-w-xl">
      <div className="border-border bg-surface rounded-xl border p-5">
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
        ref={timeSectionRef}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          selectedDate ? "mt-6 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-border bg-surface rounded-xl border p-5">
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
                  <Link
                    key={time}
                    href={`${basePath}/${selectedDate}/${time}`}
                    className="border-border bg-surface hover:border-brand hover:bg-brand hover:text-brand-foreground rounded-lg border py-2 text-center text-sm transition-colors"
                  >
                    {time}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
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

      <div className="grid grid-cols-7 gap-1.5 text-center">
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
              className={`aspect-square rounded-md text-base font-medium transition-colors ${weekdayColor} flex items-center justify-center ${
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
