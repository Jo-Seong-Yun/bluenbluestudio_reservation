import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import { resolveOpeningHours, type WeeklyHour } from "@/lib/availability/slots";
import {
  overlaps,
  parseTstzRange,
  toTstzRange,
  type Interval,
} from "@/lib/availability/range";
import { addDays, kstToday, kstToInstant, weekdayOf } from "@/lib/time";
import {
  saveWeeklyHours,
  addBlockRange,
  removeBlock,
  saveDateOverrideRange,
  removeDateOverride,
} from "@/app/admin/actions";
import { Button, Field, inputClass } from "@/components/ui";
import {
  WeekGrid,
  type CellState,
  type DayColumn,
} from "@/components/week-grid";

export const metadata: Metadata = { title: "스케줄 관리" };

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
    { data: productRows },
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
      .select("id, period, customer_name")
      .in("status", ["requested", "confirmed"])
      .overlaps("period", range),
    supabase
      .from("products")
      .select("id, name")
      .eq("is_published", true)
      .order("sort_order"),
  ]);

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
  const reservations = (reservationRows ?? []).map((r) => ({
    id: r.id,
    name: r.customer_name,
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
        };
      }

      const exactBlock = blocks.find(
        (b) =>
          b.start.getTime() === cellStart.getTime() &&
          b.end.getTime() === cellEnd.getTime(),
      );
      if (exactBlock) {
        return {
          hour: hourStr,
          state: "blocked" as CellState,
          label: exactBlock.reason ?? undefined,
        };
      }

      const bulkBlock = blocks.find((b) => overlaps(b, cell));
      if (bulkBlock) {
        return {
          hour: hourStr,
          state: "blocked-bulk" as CellState,
          label: bulkBlock.reason ?? undefined,
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

  // 미리보기: 손님 화면과 완전히 같은 함수(loadAvailableSlots)를 그대로 불러
  // 계산한다 — 여기서 따로 판정 로직을 만들면 둘이 어긋날 수 있다.
  const previewDateParam = first(sp.previewDate);
  const previewDate =
    previewDateParam && DATE_RE.test(previewDateParam)
      ? previewDateParam
      : days[0];
  const previewProduct = first(sp.previewProduct) || productRows?.[0]?.id || "";
  const previewSlots = previewProduct
    ? await loadAvailableSlots({ date: previewDate, productId: previewProduct })
    : [];

  const weekBlocks = [...blocks].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const upcomingOverrides = overrideRows ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">스케줄 관리</h1>

      <section className="border-border bg-surface mb-6 rounded-xl border p-4">
        <h2 className="font-bold">요일별 기본 운영시간</h2>
        <p className="text-muted mt-1 text-sm">
          매주 반복되는 기본 영업시간이에요. 특정 날짜만 다르게 하려면 아래
          &quot;날짜 단위 휴무/특별 운영시간&quot;을 쓰세요.
        </p>

        <div className="mt-4 space-y-2">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const row = weeklyHoursByWeekday.get(weekday);
            const color =
              weekday === 0
                ? "text-red-600 dark:text-red-400"
                : weekday === 6
                  ? "text-brand"
                  : "";
            return (
              <form
                key={weekday}
                action={saveWeeklyHours}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="weekday" value={weekday} />
                <span className={`w-6 shrink-0 text-sm font-medium ${color}`}>
                  {label}
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input type="checkbox" name="closed" defaultChecked={!row} />
                  휴무
                </label>
                <input
                  type="time"
                  name="openTime"
                  defaultValue={row?.open_time?.slice(0, 5) ?? "09:00"}
                  className={`${inputClass} !w-28 shrink-0 py-1 text-sm`}
                />
                <span className="text-muted text-xs">~</span>
                <input
                  type="time"
                  name="closeTime"
                  defaultValue={row?.close_time?.slice(0, 5) ?? "18:00"}
                  className={`${inputClass} !w-28 shrink-0 py-1 text-sm`}
                />
                <Button type="submit" variant="ghost" className="py-1 text-xs">
                  저장
                </Button>
              </form>
            );
          })}
        </div>
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
        <h2 className="font-bold">시간 구간 한 번에 차단</h2>
        <p className="text-muted mt-1 text-sm">
          하루 안의 여러 시간을 한 번에 막을 때 써요. 갑자기 생긴 개인 일정 같은
          걸 등록하면 돼요.
        </p>

        <form
          action={addBlockRange}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <Field label="날짜">
            <input
              type="date"
              name="date"
              defaultValue={days[0]}
              required
              className={`${inputClass} w-40`}
            />
          </Field>
          <Field label="시작">
            <input
              type="time"
              name="startTime"
              required
              className={`${inputClass} w-28`}
            />
          </Field>
          <Field label="종료">
            <input
              type="time"
              name="endTime"
              required
              className={`${inputClass} w-28`}
            />
          </Field>
          <Field label="사유 (선택)">
            <input
              type="text"
              name="reason"
              placeholder="개인 일정"
              className={`${inputClass} w-40`}
            />
          </Field>
          <Button type="submit">차단하기</Button>
        </form>

        {weekBlocks.length > 0 ? (
          <ul className="border-border mt-4 divide-y border-t text-sm">
            {weekBlocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span>
                  {formatRange(block.start, block.end)}
                  {block.reason ? (
                    <span className="text-muted ml-2 text-xs">
                      {block.reason}
                    </span>
                  ) : null}
                </span>
                <form action={removeBlock}>
                  <input type="hidden" name="id" value={block.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="py-1 text-xs"
                  >
                    해제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">
            이번 주에 등록된 차단이 없어요.
          </p>
        )}
      </section>

      <section className="border-border bg-surface mb-6 rounded-xl border p-4">
        <h2 className="font-bold">날짜 단위 휴무 / 특별 운영시간</h2>
        <p className="text-muted mt-1 text-sm">
          시험기간처럼 여러 날을 한 번에 휴무로 등록하거나, 특정 날짜만
          영업시간을 다르게 할 때 써요.
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
            <input
              type="time"
              name="openTime"
              className={`${inputClass} w-28`}
            />
          </Field>
          <Field label="종료 시간 (휴무 아닐 때)">
            <input
              type="time"
              name="closeTime"
              className={`${inputClass} w-28`}
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
          <Button type="submit">등록</Button>
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
                  <Button
                    type="submit"
                    variant="ghost"
                    className="py-1 text-xs"
                  >
                    해제
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">
            앞으로 등록된 휴무/예외가 없어요.
          </p>
        )}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="font-bold">손님 화면 미리보기</h2>
        <p className="text-muted mt-1 text-sm">
          위 설정대로 특정 날짜에 손님에게 실제로 어떤 시간이 보이는지 확인해요.
        </p>

        {productRows && productRows.length > 0 ? (
          <>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="week" value={week} />
              <Field label="상품">
                <select
                  name="previewProduct"
                  defaultValue={previewProduct}
                  className={`${inputClass} w-48`}
                >
                  {productRows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="날짜">
                <input
                  type="date"
                  name="previewDate"
                  defaultValue={previewDate}
                  className={`${inputClass} w-40`}
                />
              </Field>
              <Button type="submit" variant="ghost">
                확인
              </Button>
            </form>

            <div className="mt-4">
              <p className="text-sm font-medium">{previewDate}</p>
              {previewSlots.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {previewSlots.map((slot) => (
                    <span
                      key={slot.time}
                      className="border-border bg-surface-subtle rounded-lg border px-2 py-1 text-xs"
                    >
                      {slot.time}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted mt-2 text-sm">
                  이 날은 예약 가능한 시간이 없어요.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted mt-3 text-sm">
            공개된 상품이 없어서 미리볼 수 없어요. 상품 관리에서 상품을 먼저
            공개해주세요.
          </p>
        )}
      </section>
    </div>
  );
}

function formatRange(start: Date, end: Date): string {
  const date = start.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${date} ${time(start)} ~ ${time(end)}`;
}
