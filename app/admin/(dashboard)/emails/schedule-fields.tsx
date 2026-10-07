"use client";
import { useState } from "react";
import { inputClass } from "@/components/ui";
import type {
  EmailRule,
  EmailTriggerType,
} from "@/lib/notifications/email-rules-shared";

export function EmailScheduleFields({
  rule,
  triggerType,
}: {
  rule?: EmailRule;
  triggerType: EmailTriggerType;
}) {
  const [mode, setMode] = useState(rule?.timingMode ?? "calendar");
  const direction = triggerType === "days_before_shoot" ? "전" : "후";
  return (
    <fieldset className="border-border bg-surface-subtle min-w-0 space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">발송 시점</legend>
      <label className="block text-sm">
        발송 기준
        <select
          name="timingMode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "calendar" | "hours")}
          className={`${inputClass} mt-1`}
        >
          <option value="calendar">며칠 {direction} · 지정 시각</option>
          <option value="hours">몇 시간 {direction}</option>
        </select>
      </label>
      {mode === "calendar" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm">
            며칠 {direction}
            <input
              name="dayOffset"
              type="number"
              min={1}
              max={365}
              step={1}
              required
              defaultValue={rule?.dayOffset ?? 1}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block min-w-0 text-sm">
            한국시간
            <input
              name="sendTime"
              type="time"
              step={60}
              required
              defaultValue={rule?.sendTime ?? "19:00"}
              className={`${inputClass} mt-1 min-w-0`}
            />
          </label>
        </div>
      ) : (
        <label className="block text-sm">
          촬영 시작 몇 시간 {direction}
          <input
            name="hourOffset"
            type="number"
            min={1}
            max={8760}
            step={1}
            required
            defaultValue={rule?.hourOffset ?? 24}
            className={`${inputClass} mt-1`}
          />
        </label>
      )}
      <p className="text-muted text-xs leading-relaxed">
        {mode === "calendar"
          ? `예: 촬영 1일 ${direction}, 오전 09:30에 발송합니다.`
          : `예: 14:00 촬영의 2시간 ${direction}은 ${direction === "전" ? "12:00" : "16:00"}입니다. 자정을 넘는 시간도 계산합니다.`}{" "}
        저장 이후 예정된 발송부터 적용됩니다. 예약된 시각 이후 자동 발송하며 실행·메일 처리 지연이 있을 수 있습니다.
      </p>
    </fieldset>
  );
}
