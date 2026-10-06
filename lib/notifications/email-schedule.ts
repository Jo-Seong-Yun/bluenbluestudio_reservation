import { addDays, kstDateString, kstToInstant } from "@/lib/time";
import type { EmailRule } from "./email-rules-shared";

export type EmailTimingMode = "calendar" | "hours";
export function parseEmailSchedule(data: FormData, scheduled: boolean) {
  if (!scheduled)
    return {
      dayOffset: null,
      timingMode: "calendar" as const,
      sendTime: "19:00",
      hourOffset: null,
    };
  const timingMode = String(data.get("timingMode") ?? "calendar");
  if (timingMode === "hours") {
    const hourOffset = Number(data.get("hourOffset"));
    if (!Number.isInteger(hourOffset) || hourOffset < 1 || hourOffset > 8760)
      return { error: "시간은 1~8760 사이의 정수로 입력해 주시기 바랍니다." };
    return {
      dayOffset: 1,
      timingMode: "hours" as const,
      sendTime: "19:00",
      hourOffset,
    };
  }
  if (timingMode !== "calendar")
    return { error: "발송 기준을 선택해 주시기 바랍니다." };
  const dayOffset = Number(data.get("dayOffset"));
  const sendTime = String(data.get("sendTime") ?? "19:00");
  if (!Number.isInteger(dayOffset) || dayOffset < 1 || dayOffset > 365)
    return { error: "날짜는 1~365 사이의 정수로 입력해 주시기 바랍니다." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime))
    return { error: "발송 시각을 시·분으로 입력해 주시기 바랍니다." };
  return {
    dayOffset,
    timingMode: "calendar" as const,
    sendTime,
    hourOffset: null,
  };
}

export function scheduledEmailInstant(
  rule: EmailRule,
  shootStart: string,
): Date | null {
  if (!["days_before_shoot", "days_after_shoot"].includes(rule.triggerType))
    return null;
  const shoot = new Date(shootStart);
  if (!Number.isFinite(shoot.getTime())) return null;
  const direction = rule.triggerType === "days_before_shoot" ? -1 : 1;
  if (rule.timingMode === "hours") {
    if (!rule.hourOffset || rule.hourOffset < 1 || rule.hourOffset > 8760)
      return null;
    return new Date(shoot.getTime() + direction * rule.hourOffset * 3600000);
  }
  if (!rule.dayOffset || rule.dayOffset < 1 || rule.dayOffset > 365)
    return null;
  const time = rule.sendTime ?? "19:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return kstToInstant(
    addDays(kstDateString(shoot), direction * rule.dayOffset),
    time,
  );
}

/** 지연 실행은 24시간까지 보완하되, 규칙 변경 이전의 과거 메일을 대량 발송하지 않습니다. */
export function scheduledEmailIsDue(
  rule: EmailRule,
  shootStart: string,
  now: Date,
): boolean {
  const due = scheduledEmailInstant(rule, shootStart)?.getTime();
  if (
    due === undefined ||
    due > now.getTime() ||
    due < now.getTime() - 86400000
  )
    return false;
  if (rule.schedulingStartedAt && due < Date.parse(rule.schedulingStartedAt))
    return false;
  if (
    rule.triggerType === "days_before_shoot" &&
    Date.parse(shootStart) <= now.getTime()
  )
    return false;
  return true;
}

export function formatEmailSchedule(rule: EmailRule): string {
  const suffix = rule.triggerType === "days_before_shoot" ? "전" : "후";
  return rule.timingMode === "hours"
    ? `촬영 ${rule.hourOffset}시간 ${suffix}`
    : `촬영 ${rule.dayOffset}일 ${suffix} · ${rule.sendTime ?? "19:00"} (한국시간)`;
}
