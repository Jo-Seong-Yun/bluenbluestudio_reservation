import { toggleBlockHour } from "@/app/admin/actions";
import type { DateString } from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export type CellState =
  "open" | "blocked" | "blocked-bulk" | "reserved" | "closed";

export type WeekCell = {
  hour: string; // "14:00"
  state: CellState;
  label?: string;
};

export type DayColumn = {
  date: DateString;
  weekday: number;
  cells: WeekCell[];
};

// 차단 상태는 두 종류(정확히 1시간짜리, 구간 차단으로 생긴 것)를 굳이
// 다른 색으로 구분하지 않는다 — 사장님 입장에선 "막혀 있다"는 사실이
// 중요하지, 어떤 방식으로 막았는지가 중요하지 않다. 그래서 같은 회색을 쓰고,
// 칸 안의 글자(해제/차단)로만 "클릭해도 되는지"를 구분한다.
const CELL_STYLE: Record<CellState, string> = {
  open: "bg-surface border-border border hover:bg-zinc-100 dark:hover:bg-zinc-800",
  blocked: "bg-zinc-600 text-white hover:bg-zinc-500",
  "blocked-bulk": "bg-zinc-600 text-white",
  reserved: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300",
  closed: "bg-surface-subtle/50",
};

/**
 * 관리자 스케줄 화면의 주간 캘린더. 한 칸 = 1시간.
 *
 * 열려 있는 칸(open)과 정확히 그 1시간짜리 차단(blocked)만 클릭할 수 있다
 * — 클릭하면 즉시 토글(차단/해제)된다. "구간 차단"으로 만든, 이 칸과
 * 경계가 딱 맞지 않는 넓은 차단(blocked-bulk)과 예약이 있는 칸(reserved)은
 * 여기서 직접 손대지 않는다 (아래 목록에서 다룬다).
 */
export function WeekGrid({
  hours,
  columns,
}: {
  hours: number[];
  columns: DayColumn[];
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="w-10" />
              {columns.map((col) => {
                const day = Number(col.date.slice(8, 10));
                const color =
                  col.weekday === 0
                    ? "text-red-600 dark:text-red-400"
                    : col.weekday === 6
                      ? "text-brand"
                      : "";
                return (
                  <th key={col.date} className={`py-1 font-medium ${color}`}>
                    {WEEKDAY_LABELS[col.weekday]} {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour, hourIndex) => (
              <tr key={hour}>
                <td className="text-muted pr-1 text-right align-middle">
                  {String(hour).padStart(2, "0")}시
                </td>
                {columns.map((col) => (
                  <td key={col.date}>
                    <Cell date={col.date} cell={col.cells[hourIndex]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend />
    </div>
  );
}

function Cell({ date, cell }: { date: DateString; cell: WeekCell }) {
  if (cell.state === "reserved") {
    return (
      <div
        title={cell.label}
        className={`flex h-8 w-full items-center justify-center truncate rounded ${CELL_STYLE.reserved}`}
      >
        예약
      </div>
    );
  }

  if (cell.state === "blocked-bulk") {
    return (
      <div
        title={`${cell.label ? cell.label + " · " : ""}구간 차단 — 아래 목록에서 해제`}
        className={`flex h-8 w-full items-center justify-center truncate rounded ${CELL_STYLE["blocked-bulk"]}`}
      >
        차단
      </div>
    );
  }

  if (cell.state === "closed") {
    return <div className={`h-8 w-full rounded ${CELL_STYLE.closed}`} />;
  }

  // open, blocked: 클릭 한 번으로 바로 토글된다.
  return (
    <form action={toggleBlockHour}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="hour" value={cell.hour} />
      <button
        type="submit"
        title={
          cell.state === "blocked" ? "클릭하면 해제돼요" : "클릭하면 차단돼요"
        }
        className={`h-8 w-full rounded transition-colors ${CELL_STYLE[cell.state]}`}
      >
        {cell.state === "blocked" ? "해제" : ""}
      </button>
    </form>
  );
}

function Legend() {
  return (
    <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      <LegendItem
        className="bg-surface border-border border"
        label="빈 시간 — 클릭하면 차단"
      />
      <LegendItem
        className="bg-zinc-600"
        label="차단됨 — 한 칸 차단은 클릭하면 해제, 구간 차단은 아래 목록에서 해제"
      />
      <LegendItem className="bg-emerald-500/25" label="예약 있음" />
      <LegendItem className="bg-surface-subtle/50" label="운영시간 아님" />
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="text-muted inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 shrink-0 rounded ${className}`} />
      {label}
    </span>
  );
}
