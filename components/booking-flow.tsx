"use client";
import { timeDrafts } from "@/lib/booking/drafts";
import { resolveCopy, type BookingCopy } from "@/lib/booking/copy";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSlotsForDate } from "@/lib/booking/actions";
import { useReportPending } from "@/components/pending-overlay";
import { BookingCTA } from "@/components/booking-cta";
import {
  addMonths,
  monthGridDates,
  weekdayOf,
  type DateString,
} from "@/lib/time";
import { scrollAfterClick } from "@/lib/booking/click-scroll";
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CANDIDATES = 3;
type Candidate = { date: DateString; time: string };
function formatCandidate({ date, time }: Candidate) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일(${WEEKDAY_LABELS[weekdayOf(date)]}) ${time}`;
}

export function BookingFlow({
  copy: rawCopy,
  depositRequired = true,
  productId,
  productName,
  basePrice,
  durationMin,
  month,
  availableDates,
  basePath,
  minMonth,
  maxMonth,
  loadSlots,
  previewOnly = false,
}: {
  previewOnly?: boolean;
  copy?: BookingCopy;
  depositRequired?: boolean;
  productId: string;
  productName: string;
  basePrice: number;
  durationMin: number;
  month: string;
  availableDates: DateString[];
  basePath: string;
  minMonth: string;
  maxMonth: string;
  loadSlots?: (date: DateString) => Promise<string[]>;
}) {
  const copy = resolveCopy(rawCopy);
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(() =>
    previewOnly ? [] : (timeDrafts.get(productId) ?? []),
  );
  const [selectedDate, setSelectedDate] = useState<DateString | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const [pending, startTransition] = useTransition();
  useReportPending(pending);
  const isFull = candidates.length === MAX_CANDIDATES;
  const timeSection = useRef<HTMLDivElement>(null);
  const summarySection = useRef<HTMLUListElement>(null);
  const cancelScroll = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelScroll.current?.(), []);
  function guideTo(target: HTMLElement | null) {
    cancelScroll.current?.();
    cancelScroll.current = scrollAfterClick(target);
  }
  function selectDate(date: DateString) {
    setSelectedDate(date);
    setSlots([]);
    setSlotsError(null);
    guideTo(timeSection.current);
    const request = ++latestRequest.current;
    startTransition(async () => {
      try {
        const result = await (loadSlots
          ? loadSlots(date)
          : loadSlotsForDate(productId, date));
        // 먼저 누른 날짜의 늦은 응답이 현재 날짜의 시간으로 표시되지 않게 한다.
        if (request === latestRequest.current) setSlots(result);
      } catch {
        if (request === latestRequest.current)
          setSlotsError(
            "시간을 불러오지 못했습니다. 날짜를 다시 선택해 주십시오.",
          );
      }
    });
  }
  function toggle(time: string) {
    if (!selectedDate || pending) return;
    const picked = candidates.some(
      (c) => c.date === selectedDate && c.time === time,
    );
    const next = picked
      ? candidates.filter((c) => !(c.date === selectedDate && c.time === time))
      : candidates.length < MAX_CANDIDATES
        ? [...candidates, { date: selectedDate, time }]
        : candidates;
    setCandidates(next);
    if (!previewOnly) timeDrafts.set(productId, next);
    if (!picked && candidates.length === 2 && next.length === MAX_CANDIDATES)
      guideTo(summarySection.current);
    else if (!picked && next !== candidates) guideTo(timeSection.current);
  }

  function apply() {
    if (!isFull || previewOnly) return;
    const slots = candidates
      .map((c) => `${c.date}_${c.time.replace(":", "-")}`)
      .join(",");
    router.push(`${basePath}/apply?${new URLSearchParams({ slots })}`);
  }
  return (
    <div className="booking-split booking-modern-times">
      <section className="booking-card">
        <div className="booking-time-product">
          <strong>
            {productName} · {durationMin}분
          </strong>
          <span>{basePrice.toLocaleString()}원</span>
        </div>
        <h1 className="text-2xl font-bold">
          <span data-preview-target="copy:timesTitle">{copy.timesTitle}</span>
        </h1>
        <p className="text-muted mt-2 mb-6 text-sm">
          <span data-preview-target="copy:timesIntro">{copy.timesIntro}</span>
        </p>
        <p className="text-muted mb-4 text-xs">
          <span data-preview-target="copy:timesGuide">{copy.timesGuide}</span>
        </p>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <CalendarGrid
            month={month}
            availableDates={new Set(availableDates)}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            basePath={basePath}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />
          <div className="booking-time-choice min-w-0">
            <h2 className="mb-3 font-bold">
              {selectedDate
                ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8))}일 시간 선택`
                : "시간 선택"}
            </h2>
            <div ref={timeSection} className="booking-time-actions">
              {slotsError ? (
                <p role="alert" className="text-sm text-red-700">
                  {slotsError}
                </p>
              ) : pending ? (
                <p role="status" className="text-muted text-sm">
                  불러오는 중…
                </p>
              ) : !selectedDate ? (
                <p className="text-muted text-sm">
                  <span data-preview-target="copy:timesEmpty">
                    {copy.timesEmpty}
                  </span>
                </p>
              ) : slots.length === 0 ? (
                <p className="text-muted text-sm">
                  이 날짜는 예약할 수 있는 시간이 없습니다.
                </p>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2">
                  {slots.map((time) => {
                    const picked = candidates.some(
                      (c) => c.date === selectedDate && c.time === time,
                    );
                    return (
                      <button
                        type="button"
                        key={time}
                        onClick={() => toggle(time)}
                        disabled={!picked && isFull}
                        aria-pressed={picked}
                        className={`min-h-11 rounded-md border px-2 py-2 text-sm disabled:opacity-40 ${picked ? "border-brand bg-brand text-white" : "border-border hover:border-brand bg-surface"}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <aside className="booking-card booking-summary" aria-label="예약 요약">
        <p className="text-brand text-xs font-bold tracking-wider">예약 요약</p>
        <h2>{productName}</h2>
        <p className="text-muted text-sm">촬영 {durationMin}분</p>
        <Link
          href={basePath}
          className="text-brand mt-3 inline-block text-sm underline"
        >
          상품 상세 다시 보기
        </Link>
        <div className="mt-5 flex justify-between text-sm">
          <span className="font-semibold">희망 시간</span>
          <span className="text-muted" aria-live="polite">
            {candidates.length}/3개 선택
          </span>
        </div>
        <ul ref={summarySection} className="booking-summary-list">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <span>
                {i + 1}번째 ·{" "}
                {candidates[i] ? formatCandidate(candidates[i]) : "선택 전"}
              </span>
              {candidates[i] ? (
                <button
                  type="button"
                  aria-label={`${i + 1}번째 희망 시간 삭제`}
                  onClick={() =>
                    setCandidates((prev) => {
                      const next = prev.filter((_, index) => index !== i);
                      if (!previewOnly) timeDrafts.set(productId, next);
                      return next;
                    })
                  }
                  className="shrink-0 px-1"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="booking-summary-total">
          <span>기본 요금</span>
          <strong>{basePrice.toLocaleString()}원</strong>
        </div>
        <div className="booking-primary-dock">
          <BookingCTA
            ready={isFull && !pending}
            waitForScroll
            type="button"
            onClick={apply}
            disabled={!isFull || pending}
            className="mt-5 min-h-12 w-full text-base"
          >
            <span data-preview-target="copy:timesButton">
              {copy.timesButton}
            </span>
          </BookingCTA>
          <p>
            {isFull
              ? "희망 시간 3개를 선택했습니다."
              : `희망 시간을 ${MAX_CANDIDATES - candidates.length}개 더 선택합니다.`}
          </p>
        </div>
        <p className="booking-small-copy">
          <span data-preview-target="copy:timesNote">{copy.timesNote}</span>
        </p>
        <p className="text-muted mt-4 text-xs leading-relaxed">
          {depositRequired ? "확정 안내 전에는 입금하지 않습니다. " : ""}추가
          옵션은 신청서에서 선택합니다.
        </p>
      </aside>
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
      <div className="mb-3 flex items-center justify-center gap-4">
        <NavLink
          basePath={basePath}
          month={prevMonth}
          disabled={!canGoPrev}
          label="이전 달"
        >
          ←
        </NavLink>
        <p className="text-boost font-bold">
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

      <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-muted py-1 text-xs font-medium">
            {label}
          </div>
        ))}

        {grid.map((date) => {
          const inMonth = date.startsWith(month);
          const available = inMonth && availableDates.has(date);
          const day = Number(date.slice(8, 10));
          const isSelected = date === selectedDate;

          if (!available) {
            // 선택 가능한 날짜(아래)와 글자 크기·굵기를 맞춘다 — 전엔
            // 여기만 text-sm이라 선택 불가능한 날짜가 더 작아 보였다.
            return (
              <div
                key={date}
                className={`text-muted-faint aspect-square rounded-md text-base font-medium ${
                  inMonth ? "" : "opacity-0"
                } flex items-center justify-center`}
                aria-hidden={!inMonth}
              >
                {day}
              </div>
            );
          }

          return (
            <div
              key={date}
              className="flex aspect-square items-center justify-center"
            >
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                aria-label={`${date} 선택`}
                aria-pressed={isSelected}
                className={`flex h-full w-full items-center justify-center text-base font-medium transition-[background-color,transform] active:scale-90 ${
                  isSelected ? "bg-brand text-white" : "hover:bg-surface-subtle"
                }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-muted text-boost mt-3 text-xs">
        진하게 표시된 날짜만 예약할 수 있습니다.
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
  // 44×44 이상 — 모바일에서 손가락으로 누르기 충분한 최소 터치 영역
  // (예전엔 px-2 py-1로 30×28 정도밖에 안 돼 옆 글자를 잘못 누르기
  // 쉬웠다).
  const sizeClass =
    "flex h-11 w-11 items-center justify-center rounded-full text-base";

  if (disabled) {
    return (
      <span aria-hidden className={`text-muted/30 ${sizeClass}`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`${basePath}?step=times&month=${month}`}
      aria-label={label}
      className={`hover:bg-surface-subtle ${sizeClass}`}
    >
      {children}
    </Link>
  );
}
