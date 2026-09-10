"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { loadSlotsForDate } from "@/lib/booking/actions";
import { useReportPending } from "@/components/pending-overlay";
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
  useReportPending(slotsPending);
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
    <div className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-0">
      {/* 날짜 선택 카드 - Double-Bezel 아키텍처 */}
      <div className="space-y-8">
        <div className="group/calendar">
          {/* 외부 셸 */}
          <div className="rounded-3xl bg-black/2.5 p-1.5 ring-1 ring-black/8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/calendar:bg-black/4 group-hover/calendar:ring-black/12">
            {/* 내부 코어 */}
            <div className="rounded-[calc(1.5rem-0.375rem)] bg-white/95 backdrop-blur-sm p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              {/* 헤더 */}
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-2">예약 가능 날짜</p>
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-gray-900">
                  언제가 좋으신가요?
                </h2>
              </div>

              {/* 달력 */}
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
          </div>
        </div>

        {/* 시간 선택 카드 - Double-Bezel 아키텍처 */}
        <div
          ref={timeSectionRef}
          className={`grid transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            selectedDate ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="group/time">
              {/* 외부 셸 */}
              <div className="rounded-3xl bg-black/2.5 p-1.5 ring-1 ring-black/8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/time:bg-black/4 group-hover/time:ring-black/12">
                {/* 내부 코어 */}
                <div className="rounded-[calc(1.5rem-0.375rem)] bg-white/95 backdrop-blur-sm p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  {/* 헤더 */}
                  <div className="mb-6">
                    <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-2">예약 시간</p>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-gray-900">
                      정확한 시간을 선택해주세요
                    </h2>
                  </div>

                  {/* 슬롯 그리드 */}
                  {slotsPending ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
                        <p className="text-sm text-gray-600">불러오는 중…</p>
                      </div>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-gray-600 text-base leading-relaxed">
                        이 날짜는 예약할 수 있는 시간이 없어요.
                        <br />
                        다른 날짜를 선택해주세요.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {slots.map((time, idx) => (
                        <Link
                          key={time}
                          href={`${basePath}/${selectedDate}/${time.replace(":", "-")}`}
                          className="group/slot"
                        >
                          <div
                            className="relative rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center transition-all duration-300 ease-out hover:bg-gray-900 hover:border-gray-900 hover:text-white group-hover/slot:shadow-lg group-hover/slot:scale-105 transform active:scale-95 opacity-0 animate-fadeInUp"
                            style={{ animationDelay: `${idx * 30}ms` }}
                          >
                            <span className="block font-semibold text-sm sm:text-base tracking-tight">
                              {time}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 텍스트 */}
        <p className="text-center text-xs text-gray-600 tracking-wide uppercase font-medium">
          🎯 시간을 선택하면 신청서 작성으로 이동합니다
        </p>
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
    <div className="space-y-6">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <NavLink
          basePath={basePath}
          month={prevMonth}
          disabled={!canGoPrev}
          label="이전 달"
        >
          ←
        </NavLink>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
            {year}년 <span className="font-semibold">{m}</span>월
          </p>
        </div>
        <NavLink
          basePath={basePath}
          month={nextMonth}
          disabled={!canGoNext}
          label="다음 달"
        >
          →
        </NavLink>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center py-2 text-xs font-semibold uppercase tracking-widest text-gray-500"
          >
            {label}
          </div>
        ))}

        {/* 날짜 셀 */}
        {grid.map((date, idx) => {
          const inMonth = date.startsWith(month);
          const available = inMonth && availableDates.has(date);
          const day = Number(date.slice(8, 10));
          const weekday = weekdayOf(date);
          const isSelected = date === selectedDate;

          const isWeekend = weekday === 0 || weekday === 6;

          if (!available) {
            return (
              <div
                key={date}
                className={`aspect-square flex items-center justify-center rounded-2xl text-sm transition-opacity duration-300 ${
                  inMonth
                    ? `text-gray-400 ${isWeekend ? "font-medium" : ""}`
                    : "opacity-0"
                }`}
                aria-hidden={!inMonth}
              >
                {inMonth && day}
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className="group relative aspect-square"
            >
              <div
                className={`h-full w-full rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ease-out transform ${
                  isSelected
                    ? "bg-gray-900 text-white scale-100 shadow-lg ring-2 ring-gray-900"
                    : "bg-gray-100 text-gray-900 group-hover:bg-gray-200 group-hover:scale-105 group-active:scale-95"
                } ${isWeekend ? "font-bold" : ""} opacity-0 animate-fadeInUp`}
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                {day}
              </div>
            </button>
          );
        })}
      </div>

      {/* 안내 텍스트 */}
      <p className="text-center text-xs text-gray-500 font-medium">
        💡 밝은 배경의 날짜만 예약할 수 있습니다
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
      <span
        aria-hidden
        className="text-gray-300 px-3 py-2 text-lg font-light transition-opacity"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`${basePath}?month=${month}`}
      aria-label={label}
      className="group px-3 py-2 text-lg font-light text-gray-900 transition-all duration-300 ease-out hover:text-gray-600 active:scale-95"
    >
      <span className="block transition-transform duration-300 group-hover:translate-x-0.5">
        {children}
      </span>
    </Link>
  );
}
