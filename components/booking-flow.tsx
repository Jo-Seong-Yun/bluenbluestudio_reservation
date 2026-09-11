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
 * 달력 → 시간 선택을 정확히 3번(1지망~3지망) 반복해 희망 시간 후보를
 * 모은다. 후보는 확정 전까지 어떤 시간도 잠그지 않는 정책이라(다른
 * 손님도 같은 시간을 후보로 낼 수 있다), 여기서는 그냥 목록에 담기만
 * 하고 실제 서버 확인은 신청서 페이지(apply)와 제출 시점에 한다.
 *
 * 3개를 다 채워야만 신청할 수 있다 — 우선순위를 고를 여지를 남기기
 * 위해서다(reservationSchema가 서버에서도 정확히 3개를 요구한다).
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

  // 넓은 화면에서는 시간 칸이 달력 옆에 있어 굳이 스크롤할 필요가
  // 없지만, 좁은 화면(달력 아래로 쌓이는 레이아웃)에서는 이 칸이
  // 화면 아래로 밀려나 있을 수 있어 여기로 내려준다. 슬롯을 아직
  // 불러오는 중일 때(칸 안이 "불러오는 중…" 한 줄뿐이라 낮다)
  // 스크롤해버리면 그 순간의 낮은 높이를 기준으로 목표 위치가
  // 계산되어, 막상 슬롯이 채워지고 나면 화면이 중간에서 멈춰
  // 버튼들이 아래로 잘려 보인다 — 그래서 로딩이 끝난 뒤에 내린다.
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
    <div className="mx-auto mt-8 w-full max-w-5xl">
      {/* 시간 선택 칸을 달력 아래가 아니라 옆에 둔다 — 아래에 두면
          시간을 고를 때마다, 또는 날짜를 바꿀 때마다 그 칸 높이가
          바뀌면서 화면 전체가 위아래로 움직였다. 옆에 두면 이 칸
          안에서만 내용이 바뀌고 달력·후보 목록은 그대로 있다.
          달력 자체 크기는 원래 크기(lg:w-[36rem])를 그대로 유지하고,
          옆에 시간 칸을 놓을 만큼 폭이 넉넉할 때만(lg 이상) 나란히
          두며, 그전에는(화면이 좁을 때) 기존처럼 아래로 쌓는다. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="border-border bg-surface w-full shrink-0 rounded-xl border p-5 lg:w-[36rem]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">희망 시간 고르기</h2>
            <span className="text-muted text-xs">
              {candidates.length}/{MAX_CANDIDATES}개 선택
            </span>
          </div>
          <p className="text-muted mb-3 text-xs">
            희망 시간을 {MAX_CANDIDATES}개 모두 선택해 주시면, 그중 하나로
            예약을 확정해 드립니다.
          </p>

          {/* 3개를 다 골라도 달력은 그대로 둔다 — 대신 오른쪽 시간
              버튼들이 더는 눌리지 않는다(isFull). 사라졌다 나타나는
              것보다, 왜 안 눌리는지 눈으로 계속 보이는 쪽이 덜 헷갈린다. */}
          <CalendarGrid
            month={month}
            availableDates={availableSet}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            basePath={basePath}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />

          {/* 지금까지 고른 후보(1~3지망) 목록. 사장님이 이 중 하나를 골라
              확정한다 — 손님도 순서가 그대로 우선순위라는 걸 알 수 있게
              "n지망"을 붙여 보여준다.
              자리를 항상 {MAX_CANDIDATES}칸 미리 잡아둔다 — 시간을 고를
              때마다 이 목록만 커지면 아래(신청 버튼)가 매번 밀려
              내려가 불편하다. 빈 자리는 높이만 차지한 채 안 보이게
              둬서, 채워지는 동안 화면이 흔들리지 않게 한다. */}
          <ul className="mt-4 space-y-1.5">
            {Array.from(
              { length: MAX_CANDIDATES },
              (_, i) => candidates[i],
            ).map((c, i) => (
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
                  {c ? formatCandidate(c) : " "}
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
            ))}
          </ul>
        </div>

        <div
          ref={timeSectionRef}
          className="border-border bg-surface w-full flex-1 rounded-xl border p-5"
        >
          <h2 className="mb-4 font-bold">시간 선택</h2>
          {!selectedDate ? (
            <p className="text-muted text-sm">
              달력에서 날짜를 먼저 선택해 주시기 바랍니다.
            </p>
          ) : slotsPending ? (
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
                  </button>
                );
              })}
            </div>
          )}

          {/* 신청 버튼은 달력이 아니라 시간 선택 칸에 딸린 동작이다
              (3개를 다 고르면 다음 단계로 넘어간다) — 그래서 이 칸
              바로 아래, 슬롯 목록 다음에 둔다. */}
          <div className="mt-6">
            <Button
              type="button"
              disabled={!isFull}
              onClick={goToApply}
              className="w-full"
            >
              {isFull
                ? `이 ${MAX_CANDIDATES}개 시간으로 신청하기`
                : `희망 시간을 ${MAX_CANDIDATES}개 모두 선택해 주십시오`}
            </Button>
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
      <div className="mb-3 flex items-center justify-center gap-4">
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
            <div
              key={date}
              className="aspect-square flex items-center justify-center"
            >
              {/* clip-path로 히트 영역 자체를 원으로 깎는다 — border-radius만
                  으로는 시각적으로만 둥글 뿐, 네모난 모서리도 여전히 클릭
                  된다. clip-path를 주면 원 밖은 클릭도 호버도 안 먹는다.
                  원 지름은 h-10(2.5rem)의 1.4배인 h-14(3.5rem). */}
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                style={{ clipPath: "circle(50%)" }}
                className={`text-foreground flex h-14 w-14 items-center justify-center text-base font-medium transition-colors ${
                  isSelected
                    ? "bg-neutral-200 dark:bg-neutral-700"
                    : "hover:bg-surface-subtle"
                }`}
              >
                {day}
              </button>
            </div>
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
