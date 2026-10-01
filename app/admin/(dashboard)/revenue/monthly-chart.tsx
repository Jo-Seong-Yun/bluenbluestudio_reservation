import type { MonthlyRevenue } from "@/lib/revenue/summary";
import { revenueHref } from "@/lib/revenue/summary";

const won = (n: number) => `${n.toLocaleString()}원`;
const axis = (n: number) =>
  new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export function MonthlyRevenueChart({
  months,
  basePath,
}: {
  months: MonthlyRevenue[];
  basePath: string;
}) {
  // 적자도 0 아래에 그려 비용만 있는 월의 순이익을 숨기지 않는다.
  const maximum = Math.max(
    1,
    ...months.map((m) => Math.max(m.revenue, m.netProfit)),
  );
  const minimum = Math.min(0, ...months.map((m) => m.netProfit));
  const y = (value: number) =>
    20 + ((maximum - value) / (maximum - minimum)) * 175;
  const zero = y(0);
  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox="0 0 720 245"
        className="w-full min-w-[580px]"
        role="img"
        aria-label="월별 매출과 순이익 그래프. 각 월을 선택하면 월별 화면으로 이동합니다."
      >
        <title>월별 매출·순이익</title>
        {[0, 1, 2, 3].map((tick) => {
          const value = maximum - ((maximum - minimum) * tick) / 3;
          return (
            <g key={tick}>
              <line
                x1="52"
                y1={y(value)}
                x2="713"
                y2={y(value)}
                className="stroke-border"
              />
              <text
                x="45"
                y={y(value) + 4}
                textAnchor="end"
                fontSize="10"
                className="fill-muted"
              >
                {axis(value)}
              </text>
            </g>
          );
        })}
        <line
          x1="52"
          y1={zero}
          x2="713"
          y2={zero}
          className="stroke-muted"
          strokeOpacity="0.4"
        />
        {months.map((m, i) => {
          const x = 65 + i * 54;
          return (
            <a
              key={m.month}
              href={revenueHref("month", m.month, basePath)}
              aria-label={`${Number(m.month.slice(5))}월 매출 ${won(m.revenue)}, 순이익 ${won(m.netProfit)}. 월별 상세 보기`}
            >
              <title>{`${m.month} · 매출 ${won(m.revenue)} · 순이익 ${won(m.netProfit)}`}</title>
              <rect x={x} y="10" width="42" height="228" fill="transparent" />
              <rect
                x={x + 2}
                y={Math.min(zero, y(m.revenue))}
                width="15"
                height={Math.abs(zero - y(m.revenue))}
                rx="2"
                fill="#3f76b3"
              />
              <rect
                x={x + 20}
                y={Math.min(zero, y(m.netProfit))}
                width="15"
                height={Math.abs(zero - y(m.netProfit))}
                rx="2"
                fill={m.netProfit < 0 ? "#c25663" : "#78b5a6"}
              />
              <text
                x={x + 19}
                y="223"
                textAnchor="middle"
                fontSize="11"
                className="fill-muted"
              >
                {Number(m.month.slice(5))}월
              </text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
