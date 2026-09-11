"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSlotsForDate } from "@/lib/booking/actions";
import { useReportPending } from "@/components/pending-overlay";
import { Button } from "@/components/ui";
import {
  addMonths,
  monthGridDates,
  weekdayOf,
  type DateString,
} from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CANDIDATES = 3;

type Candidate = { date: DateString; time: string };

/** "9월 12일(토) 10:00" 형태로 후보 하나를 보여준다. */
function formatCandidate({ date, time }: Candidate): string {
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[weekdayOf(date)];
  return `${month}월 ${day}일(${weekday}) ${time}`;
}

/**
 * 달력 → 시간 선택을 최대 3번(1지망~3지망) 반복해 희망 시간 후보를
 * 모은다. 후보는 확정 전까지 어떤 시간도 잠그지 않는 정책이라(다른
 * 손님도 같은 시간을 후보로 낼 수 있다), 여기서는 그냥 목록에 담기만
 * 하고 실제 서버 확인은 신청서 페이지(apply)와 제출 시점에 한다.
 *
 * 최소 1개만 골라도 신청할 수 있다 — 3개를 다 채우라고 강제하지 않는다.
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
  const router = useRouter();
  const availableSet = new Set(availableDates);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateString | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsPending, startSlotsTransition] = useTransition();
  useReportPending(slotsPending);
  const timeSectionRef = useRef<HTMLDivElement>(null);

  const isFull = candidates.length >= MAX_CANDIDATES;

  function handleSelectDate(date: DateString) {
    setSelectedDate(date);
    startSlotsTransition(async () => {
      const result = await loadSlotsForDate(productId, date);
      setSlots(result);
    });
  }

  // 시간을 고를 때마다 날짜 선택으로 되돌아가면 여러 후보를 고를 때
  // 매번 달력부터 다시 눌러야 해서 번거롭다 — 시간 칸은 그대로 열어
  // 두고, 방금 고른 시간만 파란색으로 표시한다(아래 alreadyPicked).
  // 같은 버튼을 다시 누르면 취소되도록, 위 목록의 ✕와 동일하게
  // removeCandidate로 뺀다(토글).
  function toggleCandidate(time: string) {
    if (!selectedDate) return;
    setCandidates((prev) => {
      const exists = prev.some(
        (c) => c.date === selectedDate && c.time === time,
      );
      if (exists) {
        return prev.filter(
          (c) => !(c.date === selectedDate && c.time === time),
        );
      }
      if (prev.length >= MAX_CANDIDATES) return prev;
      return [...prev, { date: selectedDate, time }];
    });
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }

  function goToApply() {
    const slotsParam = candidates
      .map((c) => `${c.date}_${c.time.replace(":", "-")}`)
      .join(",");
    router.push(`${basePath}/apply?slots=${encodeURIComponent(slotsParam)}`);
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">희망 시간 고르기</h2>
          <span className="text-muted text-xs">
            {candidates.length}/{MAX_CANDIDATES}개 선택
          </span>
        </div>
        <p className="text-muted mb-3 text-xs">
          원하시는 시간을 최대 {MAX_CANDIDATES}개까지 골라 주시면, 그중
          하나로 예약을 확정해 드립니다. 1개만 선택해도 신청할 수 있습니다.
        </p>

        {/* 3개를 다 골라도 달력은 그대로 둔다 — 대신 아래 시간 버튼들이
            더는 눌리지 않는다(isFull). 사라졌다 나타나는 것보다, 왜 안
            눌리는지 눈으로 계속 보이는 쪽이 덜 헷갈린다. */}
        <CalendarGrid
          month={month}
          availableDates={availableSet}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          basePath={basePath}
          minMonth={minMonth}
          maxMonth={maxMonth}
        />

        {isFull ? (
          <p className="text-muted mt-3 text-xs">
            {MAX_CANDIDATES}개를 모두 선택하셨습니다. 다른 시간으로 바꾸려면
            아래 목록에서 삭제해 주시기 바랍니다.
          </p>
        ) : null}

        {/* 지금까지 고른 후보(1~3지망) 목록. 사장님이 이 중 하나를 골라
            확정한다 — 손님도 순서가 그대로 우선순위라는 걸 알 수 있게
            "n지망"을 붙여 보여준다.
            자리를 항상 {MAX_CANDIDATES}칸 미리 잡아둔다 — 시간을 고를
            때마다 이 목록만 커지면 아래(시간 선택 칸·신청 버튼)가 매번
            밀려 내려가 불편하다. 빈 자리는 높이만 차지한 채 안 보이게
            둬서, 채워지는 동안 화면이 흔들리지 않게 한다. */}
        <ul className="mt-4 space-y-1.5">
          {Array.from({ length: MAX_CANDIDATES }, (_, i) => candidates[i]).map(
            (c, i) => (
              <li
                key={i}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  c
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-transparent invisible"
                }`}
              >
                <span>
                  <span className="mr-1.5 opacity-80">{i + 1}지망</span>
                  {c ? formatCandidate(c) : " "}
                </span>
                {c ? (
                  <button
                    type="button"
                    onClick={() => removeCandidate(i)}
                    aria-label={`${i + 1}지망 삭제`}
                    className="text-brand-foreground/80 hover:text-brand-foreground px-1"
                  >
                    ✕
                  </button>
                ) : null}
              </li>
            ),
          )}
        </ul>
      </div>

      {/* 날짜를 고르면 이 칸이 아래로 부드럽게 펼쳐진다. 3개를 다
          골라도(isFull) 달력처럼 이 칸도 사라지지 않는다 — 시간
          버튼들만 disabled로 조용히 막는다. */}
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
                이 날짜는 예약할 수 있는 시간이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((time) => {
                  const alreadyPicked = candidates.some(
                    (c) => c.date === selectedDate && c.time === time,
                  );
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={!alreadyPicked && isFull}
                      onClick={() => toggleCandidate(time)}
                      className={`rounded-lg border py-2 text-center text-sm transition-colors ${
                        alreadyPicked
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface hover:border-brand hover:bg-brand hover:text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      }`}
                    >
                      {time}
                      {alreadyPicked ? " (선택됨)" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          disabled={candidates.length === 0}
          onClick={goToApply}
          className="w-full"
        >
          {candidates.length === 0
            ? "희망 시간을 먼저 선택해 주십시오"
            : `이 ${candidates.length}개 시간으로 신청하기`}
        </Button>
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
          const isSelected = date === selectedDate;

          if (!available) {
            return (
              <div
                key={date}
                className={`text-muted aspect-square rounded-md text-sm ${
                  inMonth ? "" : "opacity-0"
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
              className="group text-foreground aspect-square rounded-md text-base font-medium transition-colors flex items-center justify-center"
            >
              {/* 마우스오버 배경도 원 안에만 나오게, 버튼(정사각형 칸) 전체가
                  아니라 이 span(원)에만 hover 배경을 준다 — group-hover로
                  버튼 어디에 올려도(칸 모서리 포함) 반응은 하되, 실제로
                  보이는 건 원 모양만 남긴다. */}
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isSelected
                    ? "bg-neutral-200 dark:bg-neutral-700"
                    : "group-hover:bg-surface-subtle"
                }`}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-muted mt-3 text-xs">
        색이 있는 날짜만 예약할 수 있습니다.
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
