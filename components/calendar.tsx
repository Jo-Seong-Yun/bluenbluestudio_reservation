import Link from "next/link";
import { addMonths, monthGridDates, weekdayOf } from "@/lib/time";
import type { DateString } from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 순수 서버 렌더링 달력. 클라이언트 자바스크립트 없이, 날짜 칸 자체가
 * 그날 시간 선택 페이지로 가는 링크다. 이전/다음 달 이동도 링크(쿼리스트링)라
 * 새로고침해도, 링크를 복사해서 보내도 그대로 동작한다.
 */
export function Calendar({
  month,
  availableDates,
  basePath,
  minMonth,
  maxMonth,
}: {
  month: string; // "2026-09"
  availableDates: Set<DateString>;
  basePath: string; // 예: "/booking/profile"
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

          // 요일 글자색은 예약 가능 여부와 무관하게 항상 같은 규칙을 쓴다.
          // 일요일 빨강, 토요일 파랑(브랜드 색 재사용), 평일은 기본 글자색.
          // 예약 가능 여부는 배경색으로만 구분한다(요청사항).
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
            <Link
              key={date}
              href={`${basePath}/${date}`}
              className={`bg-brand/15 hover:bg-brand hover:text-brand-foreground aspect-square rounded-md text-sm font-medium transition-colors ${weekdayColor} flex items-center justify-center`}
            >
              {day}
            </Link>
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
