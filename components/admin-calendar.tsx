import Link from "next/link";
import {
  addMonths,
  monthGridDates,
  weekdayOf,
  type DateString,
} from "@/lib/time";
import { tagColorCellClass } from "@/lib/product-tag-colors";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;

export type CalendarReservation = {
  id: string;
  time: string; // "18:00"
  customerName: string;
  status: string;
  /** 이 예약이 속한 상품의 태그 색상 키(없으면 기본 색). */
  tagColor?: string | null;
};

const STATUS_DOT: Record<string, string> = {
  requested: "bg-amber-500",
  confirmed: "bg-brand",
  completed: "bg-emerald-500",
  cancelled: "bg-gray-400",
  no_show: "bg-red-500",
};

/**
 * 관리자용 예약 달력. 손님용 달력(components/calendar.tsx)과 달리
 * 모든 날짜가 클릭 가능하고(빈 날도 봐야 하니까), 칸 안에 그날 예약이
 * 시간·이름 칩으로 직접 보인다.
 */
export function AdminCalendar({
  month,
  reservationsByDate,
  selectedDate,
  selectedId,
}: {
  month: string;
  reservationsByDate: Map<DateString, CalendarReservation[]>;
  selectedDate?: DateString;
  selectedId?: string;
}) {
  const grid = monthGridDates(month);
  const [year, m] = month.split("-").map(Number);
  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-4">
        <Link
          href={`/admin/reservations?month=${prevMonth}`}
          aria-label="이전 달"
          className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
        >
          ←
        </Link>
        <p className="text-lg font-bold">
          {year}년 {m}월
        </p>
        <Link
          href={`/admin/reservations?month=${nextMonth}`}
          aria-label="다음 달"
          className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
        >
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-muted py-1 text-sm font-medium">
            {label}
          </div>
        ))}

        {grid.map((date) => {
          const inMonth = date.startsWith(month);
          const day = Number(date.slice(8, 10));
          const isSunday = weekdayOf(date) === 0;
          const items = reservationsByDate.get(date) ?? [];
          const isSelectedDay = date === selectedDate;

          // 칸 전체를 링크로 감싸면 칩마다 다른 목적지로 보내는 개별
          // 링크와 중첩돼(<a> 안에 <a>) 잘못된 HTML이 된다. 그래서 칸
          // 배경 전체를 덮는 "스트레치드 링크"를 따로 깔아 날짜 칸
          // 자체를 누를 수 있게 하고, 칩들은 그 위에 z-10으로 얹어
          // 각자 다른 목적지로 보낸다(칩을 누르면 칩이, 빈 자리를
          // 누르면 그 날짜 목록이 열린다).
          return (
            <div
              key={date}
              className={`border-border relative min-h-[150px] rounded-lg border p-1 text-left align-top ${
                inMonth ? "bg-surface" : "bg-surface-subtle/50"
              } ${isSelectedDay ? "border-brand ring-brand/30 ring-2" : ""}`}
            >
              <Link
                href={`/admin/reservations?month=${month}&date=${date}`}
                aria-label={`${date} 목록`}
                className="hover:bg-surface-subtle absolute inset-0 rounded-lg transition-colors"
              />

              <span
                className={`relative block text-sm font-medium ${
                  !inMonth
                    ? "text-muted/40"
                    : isSunday
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {day}
              </span>

              <div className="relative mt-1 space-y-0.5">
                {items.slice(0, MAX_CHIPS).map((item) => {
                  const isSelected = item.id === selectedId;
                  const tagClass = tagColorCellClass(item.tagColor);
                  return (
                    <Link
                      key={item.id}
                      href={`/admin/reservations?month=${month}&date=${date}&id=${item.id}`}
                      className={`relative z-10 block truncate rounded px-1 py-0.5 text-xs leading-tight transition-colors ${
                        isSelected
                          ? "bg-brand text-brand-foreground"
                          : (tagClass ?? "bg-surface-subtle hover:bg-brand/20")
                      }`}
                    >
                      <span
                        className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status] ?? "bg-gray-400"}`}
                      />
                      {item.time} {item.customerName}
                    </Link>
                  );
                })}
                {items.length > MAX_CHIPS ? (
                  <Link
                    href={`/admin/reservations?month=${month}&date=${date}`}
                    className="text-muted hover:text-brand relative z-10 block text-xs"
                  >
                    +{items.length - MAX_CHIPS}건 더
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
