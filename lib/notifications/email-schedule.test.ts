import { describe, expect, it } from "vitest";
import {
  formatEmailSchedule,
  parseEmailSchedule,
  scheduledEmailInstant,
  scheduledEmailIsDue,
} from "./email-schedule";
import type { EmailRule } from "./email-rules-shared";
const rule: EmailRule = {
  id: "r",
  name: "안내",
  enabled: true,
  recipients: ["customer"],
  triggerType: "days_before_shoot",
  dayOffset: 1,
  productId: null,
  subject: "안내",
  body: "본문",
  ctas: [],
};
const form = (values: Record<string, string | undefined>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined) data.set(k, v);
  return data;
};
describe("예약 이메일 발송 시점", () => {
  it("기존 규칙은 촬영 전날 한국시간 19시", () =>
    expect(
      scheduledEmailInstant(rule, "2026-10-08T05:00:00Z")?.toISOString(),
    ).toBe("2026-10-07T10:00:00.000Z"));
  it("촬영 시각과 관계없이 지정한 시/분, 월말과 연말을 계산", () => {
    expect(
      scheduledEmailInstant(
        { ...rule, sendTime: "09:30" },
        "2027-01-01T05:00:00Z",
      )?.toISOString(),
    ).toBe("2026-12-31T00:30:00.000Z");
    expect(
      scheduledEmailInstant(
        { ...rule, sendTime: "00:05" },
        "2026-11-01T01:00:00Z",
      )?.toISOString(),
    ).toBe("2026-10-30T15:05:00.000Z");
  });
  it("몇 시간 전은 정확한 촬영 시각에서 차감, 자정을 넘어 계산", () => {
    expect(
      scheduledEmailInstant(
        { ...rule, timingMode: "hours", hourOffset: 2 },
        "2026-10-08T05:00:00Z",
      )?.toISOString(),
    ).toBe("2026-10-08T03:00:00.000Z");
    expect(
      scheduledEmailInstant(
        { ...rule, timingMode: "hours", hourOffset: 4 },
        "2026-10-07T16:00:00Z",
      )?.toISOString(),
    ).toBe("2026-10-07T12:00:00.000Z");
  });
  it("며칠/몇 시간 후도 같은 기준으로 계산", () => {
    expect(
      scheduledEmailInstant(
        { ...rule, triggerType: "days_after_shoot", sendTime: "09:30" },
        "2026-10-08T05:00:00Z",
      )?.toISOString(),
    ).toBe("2026-10-09T00:30:00.000Z");
    expect(
      scheduledEmailInstant(
        {
          ...rule,
          triggerType: "days_after_shoot",
          timingMode: "hours",
          hourOffset: 2,
        },
        "2026-10-08T05:00:00Z",
      )?.toISOString(),
    ).toBe("2026-10-08T07:00:00.000Z");
  });
  it("발송 시각 이후만 실행하고 최대 24시간 지연을 보완", () => {
    const shoot = "2026-10-08T05:00:00Z";
    expect(
      scheduledEmailIsDue(rule, shoot, new Date("2026-10-07T09:59:59Z")),
    ).toBe(false);
    expect(
      scheduledEmailIsDue(rule, shoot, new Date("2026-10-07T10:00:00Z")),
    ).toBe(true);
    expect(
      scheduledEmailIsDue(rule, shoot, new Date("2026-10-07T10:05:00Z")),
    ).toBe(true);
    const after = { ...rule, triggerType: "days_after_shoot" as const };
    expect(
      scheduledEmailIsDue(after, shoot, new Date("2026-10-10T10:00:00Z")),
    ).toBe(true);
    expect(
      scheduledEmailIsDue(after, shoot, new Date("2026-10-10T10:00:01Z")),
    ).toBe(false);
  });
  it("규칙 적용 이전과 이미 시작한 촬영의 사전 메일은 발송하지 않음", () => {
    expect(
      scheduledEmailIsDue(
        { ...rule, schedulingStartedAt: "2026-10-07T10:01:00Z" },
        "2026-10-08T05:00:00Z",
        new Date("2026-10-07T10:05:00Z"),
      ),
    ).toBe(false);
    expect(
      scheduledEmailIsDue(
        rule,
        "2026-10-08T05:00:00Z",
        new Date("2026-10-08T05:00:00Z"),
      ),
    ).toBe(false);
  });
  it("잘못된 시각/촬영/일수/시간은 실행하지 않음", () => {
    expect(
      scheduledEmailInstant(
        { ...rule, sendTime: "24:00" },
        "2026-10-08T05:00:00Z",
      ),
    ).toBeNull();
    expect(scheduledEmailInstant(rule, "bad")).toBeNull();
    expect(
      scheduledEmailInstant({ ...rule, dayOffset: 0 }, "2026-10-08T05:00:00Z"),
    ).toBeNull();
    expect(
      scheduledEmailInstant(
        { ...rule, timingMode: "hours", hourOffset: null },
        "2026-10-08T05:00:00Z",
      ),
    ).toBeNull();
  });
  it("서버도 입력 범위와 활성 방식만 검증", () => {
    expect(
      parseEmailSchedule(form({ dayOffset: "2", sendTime: "08:15" }), true),
    ).toMatchObject({ dayOffset: 2, sendTime: "08:15", hourOffset: null });
    expect(
      parseEmailSchedule(
        form({ timingMode: "hours", hourOffset: "2", sendTime: "bad" }),
        true,
      ),
    ).toMatchObject({ timingMode: "hours", hourOffset: 2 });
    for (const data of [
      { dayOffset: "0" },
      { dayOffset: "1", sendTime: "09:75" },
      { timingMode: "hours", hourOffset: "0" },
      { timingMode: "hours", hourOffset: "1.5" },
      { timingMode: "bad" },
    ])
      expect(parseEmailSchedule(form(data), true)).toHaveProperty("error");
    expect(
      parseEmailSchedule(form({ timingMode: "bad" }), false),
    ).not.toHaveProperty("error");
  });
  it("목록에 실제 기준과 한국시간 표시", () => {
    expect(formatEmailSchedule(rule)).toBe("촬영 1일 전 · 19:00 (한국시간)");
    expect(
      formatEmailSchedule({ ...rule, timingMode: "hours", hourOffset: 2 }),
    ).toBe("촬영 2시간 전");
  });
});
