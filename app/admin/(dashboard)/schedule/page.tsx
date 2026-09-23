import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveOpeningHours, type WeeklyHour } from "@/lib/availability/slots";
import {
  overlaps,
  parseTstzRange,
  toTstzRange,
  type Interval,
} from "@/lib/availability/range";
import { addDays, kstToday, kstToInstant, weekdayOf } from "@/lib/time";
import { saveDateOverrideRange, removeDateOverride } from "@/app/admin/actions";
import { Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TimeSelect } from "@/components/time-select";
import {
  WeekGrid,
  type CellState,
  type DayColumn,
} from "@/components/week-grid";
import { WeeklyHoursEditor } from "./weekly-hours-editor";

export const metadata: Metadata = { title: "스케줄관리" };

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SchedulePage({
  searchParams,
}: PageProps<"/admin/schedule">) {
  const sp = await searchParams;

  const weekParam = first(sp.week);
  const week = weekParam && DATE_RE.test(weekParam) ? weekParam : kstToday();
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const prevWeek = addDays(week, -7);
  const nextWeek = addDays(week, 7);

  const supabase = await createClient();

  const range = toTstzRange({
    start: kstToInstant(days[0], "00:00"),
    end: kstToInstant(days[6], "24:00"),
  });

  const [
    { data: weeklyHoursRows },
    { data: overrideRows },
    { data: blockRows },
    { data: reservationRows },
    { data: productColorRows },
  ] = await Promise.all([
    supabase
      .from("weekly_hours")
      .select("id, weekday, open_time, close_time")
      .order("weekday"),
    supabase
      .from("date_overrides")
      .select("id, date, is_closed, open_time, close_time, reason")
      .gte("date", kstToday())
      .order("date"),
    supabase
      .from("blocks")
      .select("id, period, reason")
      .overlaps("period", range),
    supabase
      .from("reservations")
      .select("id, period, customer_name, product_id")
      .in("status", ["requested", "schedule_confirmed", "payment_confirmed"])
      .overlaps("period", range),
    supabase.from("products").select("id, tag_color"),
  ]);

  const tagColorByProductId = new Map(
    (productColorRows ?? []).map((p) => [p.id, p.tag_color]),
  );

  const weeklyHoursByWeekday = new Map(
    (weeklyHoursRows ?? []).map((r) => [r.weekday, r]),
  );
  const weeklyHours: WeeklyHour[] = (weeklyHoursRows ?? []).map((r) => ({
    weekday: r.weekday,
    openTime: r.open_time,
    closeTime: r.close_time,
  }));

  const overridesByDate = new Map(
    (overrideRows ?? []).map((r) => [
      r.date,
      { isClosed: r.is_closed, openTime: r.open_time, closeTime: r.close_time },
    ]),
  );

  const blocks = (blockRows ?? []).map((r) => ({
    id: r.id,
    reason: r.reason,
    ...parseTstzRange(r.period),
  }));
  // period가 null인 행(1~3지망 후보만 낸 채 아직 확정 전인 예약)은
  // 위 쿼리의 .overlaps("period", range)가 이미 걸러내지만, 타입
  // 시스템은 그걸 모르니 한 번 더 좁힌다.
  const reservations = (reservationRows ?? [])
    .filter((r): r is typeof r & { period: string } => r.period !== null)
    .map((r) => ({
      id: r.id,
      name: r.customer_name,
      tagColor: r.product_id
        ? (tagColorByProductId.get(r.product_id) ?? null)
        : null,
      ...parseTstzRange(r.period),
    }));

  // 이번 주에 표시할 시간 범위. 그 주에 실제로 열려있는 시간이 하나도
  // 없으면(전부 휴무) 기본값으로 09~21시를 보여준다 — 빈 화면보다는
  // 낫고, 차단/운영시간 설정은 그 상태에서도 계속할 수 있어야 한다.
  let minHour = 24;
  let maxHour = 0;
  const dayOpenings = days.map((date) => {
    const openings = resolveOpeningHours({
      date,
      dateOverride: overridesByDate.get(date) ?? null,
      weeklyHours,
    });
    for (const o of openings) {
      const [openHour] = o.openTime.split(":").map(Number);
      const [closeHour, closeMinute] = o.closeTime.split(":").map(Number);
      minHour = Math.min(minHour, openHour);
      maxHour = Math.max(maxHour, closeMinute > 0 ? closeHour + 1 : closeHour);
    }
    return { date, openings };
  });
  if (minHour > maxHour) {
    minHour = 9;
    maxHour = 21;
  }
  const hours = Array.from(
    { length: maxHour - minHour },
    (_, i) => minHour + i,
  );

  const columns: DayColumn[] = dayOpenings.map(({ date, openings }) => ({
    date,
    weekday: weekdayOf(date),
    cells: hours.map((hour) => {
      const hourStr = `${String(hour).padStart(2, "0")}:00`;
      const cellStart = kstToInstant(date, hourStr);
      const cellEnd = new Date(cellStart.getTime() + 60 * 60_000);
      const cell: Interval = { start: cellStart, end: cellEnd };

      const reservation = reservations.find((r) => overlaps(r, cell));
      if (reservation) {
        return {
          hour: hourStr,
          state: "reserved" as CellState,
          label: reservation.name,
          tagColor: reservation.tagColor,
        };
      }

      // 이제 차단은 주간 캘린더 클릭(정확히 1시간 단위)으로만 만들어지므로
      // 정확히 겹치는 차단이 있는지만 보면 된다.
      const block = blocks.find(
        (b) =>
          b.start.getTime() === cellStart.getTime() &&
          b.end.getTime() === cellEnd.getTime(),
      );
      if (block) {
        return {
          hour: hourStr,
          state: "blocked" as CellState,
          label: block.reason ?? undefined,
        };
      }

      const isOpen = openings.some((o) => {
        const openAt = kstToInstant(date, o.openTime);
        const closeAt = kstToInstant(date, o.closeTime);
        return cellStart >= openAt && cellEnd <= closeAt;
      });
      return {
        hour: hourStr,
        state: (isOpen ? "open" : "closed") as CellState,
      };
    }),
  }));

  const upcomingOverrides = overrideRows ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">스케줄관리</h1>

      <section className="border-border bg-surface mb-6 rounded-xl border p-4">
        <h2 className="font-bold">요일별 기본 운영시간</h2>
        <p className="text-muted mt-1 text-sm">
          매주 반복되는 기본 영업시간입니다. 특정 날짜만 다르게 하려면 아래
          &quot;날짜 단위 휴무/특별 운영시간&quot;을 사용해 주십시오.
        </p>

        <WeeklyHoursEditor
          initial={WEEKDAY_LABELS.map((label, weekday) => {
            const row = weeklyHoursByWeekday.get(weekday);
            return {
              weekday,
              label,
              color:
                weekday === 0
                  ? "text-red-600 dark:text-red-400"
                  : weekday === 6
                    ? "text-brand"
                    : "",
              closed: !row,
              openTime: row?.open_time?.slice(0, 5) ?? "09:00",
              closeTime: row?.close_time?.slice(0, 5) ?? "18:00",
            };
          })}
        />
      </section>

      <section className="border-border bg-surface mb-6 rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">주간 캘린더</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/schedule?week=${prevWeek}`}
              className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
            >
              ← 지난주
            </Link>
            <span className="text-muted text-sm">
              {days[0]} ~ {days[6]}
            </span>
            <Link
              href={`/admin/schedule?week=${nextWeek}`}
              className="hover:bg-surface-subtle rounded px-2 py-1 text-sm"
            >
              다음주 →
            </Link>
          </div>
        </div>

        <WeekGrid hours={hours} columns={columns} />
      </section>

      <section className="border-border bg-surface mb-6 rounded-xl border p-4">
        <h2 className="font-bold">날짜 단위 휴무 / 특별 운영시간</h2>
        <p className="text-muted mt-1 text-sm">
          시험기간처럼 여러 날을 한 번에 휴무로 등록하거나, 특정 날짜만
          영업시간을 다르게 할 때 사용합니다.
        </p>

        <form
          action={saveDateOverrideRange}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <Field label="시작일">
            <input
              type="date"
              name="startDate"
              defaultValue={days[0]}
              required
              className={`${inputClass} w-40`}
            />
          </Field>
          <Field label="종료일">
            <input
              type="date"
              name="endDate"
              defaultValue={days[0]}
              className={`${inputClass} w-40`}
            />
          </Field>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="closed" defaultChecked />
            휴무
          </label>
          <Field label="시작 시간 (휴무 아닐 때)">
            <TimeSelect
              name="openTime"
              defaultValue="09:00"
              className={`${inputClass} w-32`}
            />
          </Field>
          <Field label="종료 시간 (휴무 아닐 때)">
            <TimeSelect
              name="closeTime"
              defaultValue="18:00"
              className={`${inputClass} w-32`}
            />
          </Field>
          <Field label="사유 (선택)">
            <input
              type="text"
              name="reason"
              placeholder="기말고사 기간"
              className={`${inputClass} w-40`}
            />
          </Field>
          <SubmitButton>등록</SubmitButton>
        </form>

        {upcomingOverrides.length > 0 ? (
          <ul className="border-border mt-4 divide-y border-t text-sm">
            {upcomingOverrides.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span>
                  {o.date} —{" "}
                  {o.is_closed
                    ? "휴무"
                    : `${o.open_time?.slice(0, 5)} ~ ${o.close_time?.slice(0, 5)}`}
                  {o.reason ? (
                    <span className="text-muted ml-2 text-xs">{o.reason}</span>
                  ) : null}
                </span>
                <form action={removeDateOverride}>
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton variant="ghost" className="py-1 text-xs">
                    해제
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">
            앞으로 등록된 휴무/예외가 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
