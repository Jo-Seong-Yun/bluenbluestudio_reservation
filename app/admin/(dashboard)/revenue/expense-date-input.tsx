"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

export function ExpenseDateInput({
  defaultDate,
  periodPrefix,
}: {
  defaultDate?: string;
  periodPrefix?: string;
}) {
  const [date, setDate] = useState(defaultDate ?? "");
  const outsidePeriod = date && periodPrefix && !date.startsWith(periodPrefix);
  return (
    <label className="w-40">
      <span className="text-muted mb-1 block text-xs">일자</span>
      <input
        name="date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={inputClass}
      />
      {outsidePeriod ? (
        <span
          className="mt-1 block text-xs text-amber-700 dark:text-amber-300"
          role="status"
        >
          {date.slice(0, 4)}년 {Number(date.slice(5, 7))}월 지출로 등록됩니다.
        </span>
      ) : null}
    </label>
  );
}
