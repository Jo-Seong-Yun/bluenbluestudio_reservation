"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  revenueHref,
  validRevenueMonth,
  type RevenuePeriod,
} from "@/lib/revenue/summary";

export function RevenuePeriodPicker({
  period,
  basePath,
}: {
  period: RevenuePeriod;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="text-muted flex items-center gap-2 text-xs">
      <span className="sr-only">
        {period.view === "year" ? "연도 선택" : "월 선택"}
      </span>
      <input
        key={`${period.view}-${period.month}`}
        type={period.view === "year" ? "number" : "month"}
        aria-label={period.view === "year" ? "연도 선택" : "월 선택"}
        defaultValue={period.view === "year" ? period.year : period.month}
        min={period.view === "year" ? 1900 : "1900-01"}
        max={period.view === "year" ? 9998 : "9998-12"}
        disabled={pending}
        className="border-border bg-surface text-foreground h-10 w-36 rounded-md border px-3 text-sm disabled:opacity-50"
        onChange={(event) => {
          const value = event.target.value;
          // 연도는 네 자리를 다 입력한 뒤에만 이동해 타이핑 중 화면이 바뀌지 않는다.
          const month =
            period.view === "year"
              ? `${value}-${period.month.slice(5)}`
              : value;
          if (!validRevenueMonth(month)) return;
          startTransition(() =>
            router.push(revenueHref(period.view, month, basePath)),
          );
        }}
      />
      <span className="sr-only" role="status">
        {pending ? "기간을 불러오는 중입니다." : ""}
      </span>
    </label>
  );
}

export function RevenueExpenseFilter({
  period,
  selected,
  basePath,
}: {
  period: RevenuePeriod;
  selected?: string;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="text-muted flex shrink-0 items-center gap-2 text-xs">
      표시 월
      <select
        aria-label="지출 표시 월"
        value={selected ?? ""}
        disabled={pending}
        onChange={(e) => {
          const month = e.target.value || undefined;
          startTransition(() =>
            router.push(revenueHref("year", period.month, basePath, month)),
          );
        }}
        className="border-border bg-surface text-foreground h-10 rounded-md border px-3 text-sm"
      >
        <option value="">전체 월</option>
        {Array.from({ length: 12 }, (_, i) => {
          const month = `${period.year}-${String(i + 1).padStart(2, "0")}`;
          return (
            <option key={month} value={month}>
              {i + 1}월
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function RevenueRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="border-border bg-surface mt-3 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "불러오는 중…" : "다시 불러오기"}
    </button>
  );
}
