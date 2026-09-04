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

const CELL_STYLE: Record<CellState, string> = {
  open: "bg-surface border-border border hover:bg-red-100 dark:hover:bg-red-950",
  blocked: "bg-red-500 text-white hover:bg-red-600",
  "blocked-bulk": "bg-red-500/30 text-red-800 dark:text-red-300",
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
  week,
  hours,
  columns,
}: {
  week: string;
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
                    <Cell
                      week={week}
                      date={col.date}
                      cell={col.cells[hourIndex]}
                    />
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

function Cell({
  week,
  date,
  cell,
}: {
  week: string;
  date: DateString;
  cell: WeekCell;
}) {
  const interactive = cell.state === "open" || cell.state === "blocked";

  if (!interactive) {
    return (
      <div
        title={cell.label}
        className={`flex h-8 w-full items-center justify-center truncate rounded ${CELL_STYLE[cell.state]}`}
      >
        {cell.state === "reserved"
          ? "예약"
          : cell.state === "blocked-bulk"
            ? "차단"
            : ""}
      </div>
    );
  }

  return (
    <form action={toggleBlockHour}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="hour" value={cell.hour} />
      <input type="hidden" name="week" value={week} />
      <button
        type="submit"
        title={cell.label}
        className={`h-8 w-full rounded transition-colors ${CELL_STYLE[cell.state]}`}
      >
        {cell.state === "blocked" ? "차단" : ""}
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
      <LegendItem className="bg-red-500" label="차단됨 — 클릭하면 해제" />
      <LegendItem
        className="bg-red-500/30"
        label="구간 차단 — 아래 목록에서 해제"
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
