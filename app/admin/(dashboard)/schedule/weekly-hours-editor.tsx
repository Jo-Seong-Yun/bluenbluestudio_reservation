"use client";

import { useState } from "react";
import { saveWeeklyHours } from "@/app/admin/actions";
import { TimeSelect } from "@/components/time-select";
import { inputClass } from "@/components/ui";

export type WeeklyHourRow = {
  weekday: number;
  label: string;
  color: string;
  closed: boolean;
  openTime: string;
  closeTime: string;
};

/**
 * 요일별 기본 운영시간. 예전엔 요일마다 "저장" 버튼을 따로 눌러야
 * 했는데, 서버 액션의 revalidatePath 재렌더가 defaultValue/
 * defaultChecked(비제어 입력)를 다시 반영하지 못해 화면이 기존 값으로
 * 남아 있다가 새로고침해야만 바뀐 값이 보이는 문제가 있었다.
 *
 * 값을 이 컴포넌트의 state로 들고 제어 입력으로 바꿔, 바뀌는 즉시
 * 화면에 그대로 반영되게 하고(서버 응답을 기다리지 않는다), 그 값을
 * 그대로 서버 액션에도 실어 보내 저장한다 — 버튼 없이 바뀔 때마다
 * 자동으로 저장된다.
 */
export function WeeklyHoursEditor({ initial }: { initial: WeeklyHourRow[] }) {
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState<
    Record<number, "saving" | "saved" | undefined>
  >({});

  function change(row: WeeklyHourRow, patch: Partial<WeeklyHourRow>) {
    const next = { ...row, ...patch };
    setRows((prev) => prev.map((r) => (r.weekday === row.weekday ? next : r)));
    save(next);
  }

  function save(row: WeeklyHourRow) {
    setStatus((prev) => ({ ...prev, [row.weekday]: "saving" }));
    const formData = new FormData();
    formData.set("weekday", String(row.weekday));
    if (row.closed) formData.set("closed", "on");
    formData.set("openTime", row.openTime);
    formData.set("closeTime", row.closeTime);

    saveWeeklyHours(formData).then(() => {
      setStatus((prev) => ({ ...prev, [row.weekday]: "saved" }));
      setTimeout(() => {
        setStatus((prev) =>
          prev[row.weekday] === "saved"
            ? { ...prev, [row.weekday]: undefined }
            : prev,
        );
      }, 1200);
    });
  }

  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <div key={row.weekday} className="flex flex-wrap items-center gap-2">
          <span className={`w-6 shrink-0 text-sm font-medium ${row.color}`}>
            {row.label}
          </span>
          <label className="flex shrink-0 items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={row.closed}
              onChange={(e) => change(row, { closed: e.target.checked })}
            />
            휴무
          </label>
          <TimeSelect
            value={row.openTime}
            onChange={(v) => change(row, { openTime: v })}
            className={`${inputClass} !w-32 shrink-0 py-1 text-sm`}
          />
          <span className="text-muted text-xs">~</span>
          <TimeSelect
            value={row.closeTime}
            onChange={(v) => change(row, { closeTime: v })}
            className={`${inputClass} !w-32 shrink-0 py-1 text-sm`}
          />
          <span className="text-muted w-14 shrink-0 text-xs">
            {status[row.weekday] === "saving"
              ? "저장 중…"
              : status[row.weekday] === "saved"
                ? "저장됨"
                : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
