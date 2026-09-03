import { describe, expect, it } from "vitest";
import { kstToInstant, weekdayOf } from "../time";
import { computeAvailableSlots, type AvailabilityInput } from "./slots";

/** 기준 상황: 2026-09-03(목) 아침에 접속. 목요일은 18~21시 운영. 60분 촬영. */
function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: "2026-09-10", // 목요일
    now: kstToInstant("2026-09-03", "09:00"),
    today: "2026-09-03",
    product: { durationMin: 60, bufferAfterMin: 0 },
    settings: { slotIntervalMin: 60, minLeadDays: 1, maxAdvanceDays: 60 },
    weeklyHours: [{ weekday: 4, openTime: "18:00:00", closeTime: "21:00:00" }],
    dateOverride: null,
    blocks: [],
    reservations: [],
    ...overrides,
  };
}

const timesOf = (i: AvailabilityInput) =>
  computeAvailableSlots(i).map((slot) => slot.time);

const span = (date: string, from: string, to: string) => ({
  start: kstToInstant(date, from),
  end: kstToInstant(date, to),
});

describe("기본 동작", () => {
  it("운영시간을 슬롯 간격으로 쪼갠다", () => {
    expect(timesOf(input())).toEqual(["18:00", "19:00", "20:00"]);
  });

  it("촬영 종료 시각도 함께 돌려준다", () => {
    const [first] = computeAvailableSlots(input());
    expect(first.start.toISOString()).toBe("2026-09-10T09:00:00.000Z"); // KST 18:00
    expect(first.end.toISOString()).toBe("2026-09-10T10:00:00.000Z"); // KST 19:00
  });

  it("운영시간이 없는 요일은 휴무다", () => {
    // 2026-09-09는 수요일. weeklyHours에는 목요일만 있다
    expect(timesOf(input({ date: "2026-09-09" }))).toEqual([]);
  });

  it("한 요일에 오전/오후가 나뉘어 있어도 모두 반영한다", () => {
    const times = timesOf(
      input({
        weeklyHours: [
          { weekday: 4, openTime: "10:00:00", closeTime: "12:00:00" },
          { weekday: 4, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["10:00", "11:00", "18:00", "19:00"]);
  });
});

describe("운영시간 경계", () => {
  it("마감까지 끝낼 수 없는 촬영은 슬롯이 되지 않는다", () => {
    // 18~21시에 120분 촬영 → 18시, 19시만 가능 (20시는 22시에 끝나 마감 초과)
    const times = timesOf(
      input({ product: { durationMin: 120, bufferAfterMin: 0 } }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });

  it("마감 30분 전에는 60분 촬영을 받지 않는다", () => {
    const times = timesOf(
      input({
        weeklyHours: [
          { weekday: 4, openTime: "18:00:00", closeTime: "19:30:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00"]);
  });

  it("촬영 시간이 딱 맞아떨어지면 마지막 슬롯도 살아있다", () => {
    const times = timesOf(
      input({
        weeklyHours: [
          { weekday: 4, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });
});

describe("정리 시간(버퍼)", () => {
  it("버퍼가 마감을 넘기면 마지막 슬롯이 닫힌다", () => {
    // 18~21시, 60분 촬영 + 30분 정리 → 20시 슬롯은 21:30에 끝나므로 불가
    const times = timesOf(
      input({ product: { durationMin: 60, bufferAfterMin: 30 } }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });

  it("버퍼는 기존 예약과의 충돌 판정에도 들어간다", () => {
    // 19시에 예약이 있고, 18시 촬영은 60분+30분이라 19:30까지 자리를 잡는다 → 충돌
    const times = timesOf(
      input({
        product: { durationMin: 60, bufferAfterMin: 30 },
        reservations: [span("2026-09-10", "19:00", "20:00")],
      }),
    );
    expect(times).toEqual([]);
  });

  it("버퍼가 0이면 연달아 예약할 수 있다", () => {
    const times = timesOf(
      input({
        product: { durationMin: 60, bufferAfterMin: 0 },
        reservations: [span("2026-09-10", "18:00", "19:00")],
      }),
    );
    // 18시는 찼지만 19시는 바로 이어서 가능하다
    expect(times).toEqual(["19:00", "20:00"]);
  });
});

describe("3층 구조 — date_overrides가 weekly_hours를 덮어쓴다", () => {
  it("휴무로 지정하면 운영시간이 있어도 통째로 닫힌다", () => {
    const times = timesOf(
      input({
        dateOverride: { isClosed: true, openTime: null, closeTime: null },
      }),
    );
    expect(times).toEqual([]);
  });

  it("다른 시간대로 바꾸면 그 시간이 이긴다", () => {
    const times = timesOf(
      input({
        dateOverride: {
          isClosed: false,
          openTime: "10:00:00",
          closeTime: "13:00:00",
        },
      }),
    );
    expect(times).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("평소 쉬는 요일도 예외로 열 수 있다", () => {
    const times = timesOf(
      input({
        date: "2026-09-09", // 수요일 — weeklyHours에 없음
        dateOverride: {
          isClosed: false,
          openTime: "14:00:00",
          closeTime: "16:00:00",
        },
      }),
    );
    expect(times).toEqual(["14:00", "15:00"]);
  });

  it("휴무가 아닌데 시간이 비어 있으면 안전하게 닫는다", () => {
    const times = timesOf(
      input({
        dateOverride: { isClosed: false, openTime: null, closeTime: null },
      }),
    );
    expect(times).toEqual([]);
  });
});

describe("3층 구조 — blocks가 최종 결정권을 가진다", () => {
  it("막아둔 시간의 슬롯이 사라진다", () => {
    const times = timesOf(
      input({ blocks: [span("2026-09-10", "19:00", "20:00")] }),
    );
    expect(times).toEqual(["18:00", "20:00"]);
  });

  it("걸치기만 해도 그 슬롯은 닫힌다", () => {
    // 19:30~20:30 차단 → 19시(19~20)와 20시(20~21) 슬롯 모두 물린다
    const times = timesOf(
      input({ blocks: [span("2026-09-10", "19:30", "20:30")] }),
    );
    expect(times).toEqual(["18:00"]);
  });

  it("date_overrides로 연 시간에도 blocks가 그대로 적용된다", () => {
    const times = timesOf(
      input({
        dateOverride: {
          isClosed: false,
          openTime: "10:00:00",
          closeTime: "13:00:00",
        },
        blocks: [span("2026-09-10", "11:00", "12:00")],
      }),
    );
    expect(times).toEqual(["10:00", "12:00"]);
  });
});

describe("기존 예약", () => {
  it("이미 잡힌 시간은 빠진다", () => {
    const times = timesOf(
      input({ reservations: [span("2026-09-10", "18:00", "19:00")] }),
    );
    expect(times).toEqual(["19:00", "20:00"]);
  });

  it("호출자가 넘긴 예약만 막는다 — 취소된 건은 넘기지 않는다", () => {
    // load.ts가 requested/confirmed만 조회한다. 여기서는 넘어온 것만 본다.
    expect(timesOf(input({ reservations: [] }))).toEqual([
      "18:00",
      "19:00",
      "20:00",
    ]);
  });
});

describe("당일 예약 차단 — 최소 1일 전 규칙", () => {
  it("오늘은 예약할 수 없다", () => {
    expect(timesOf(input({ date: "2026-09-03", today: "2026-09-03" }))).toEqual(
      [],
    );
  });

  it("내일은 시간과 무관하게 열린다", () => {
    // 2026-09-04는 금요일이므로 금요일 운영시간을 준다
    const times = timesOf(
      input({
        date: "2026-09-04",
        today: "2026-09-03",
        now: kstToInstant("2026-09-03", "23:30"), // 밤늦게 접속해도
        weeklyHours: [
          { weekday: 5, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });

  it("지난 날짜는 열리지 않는다", () => {
    expect(timesOf(input({ date: "2026-09-01", today: "2026-09-03" }))).toEqual(
      [],
    );
  });

  it("minLeadDays를 늘리면 그만큼 뒤로 밀린다", () => {
    const settings = {
      slotIntervalMin: 60,
      minLeadDays: 3,
      maxAdvanceDays: 60,
    };
    // 9/3 기준 9/5는 이틀 뒤 → 아직 안 됨
    expect(timesOf(input({ date: "2026-09-05", settings }))).toEqual([]);
    // 9/6은 사흘 뒤 → 열림 (일요일)
    const times = timesOf(
      input({
        date: "2026-09-06",
        settings,
        weeklyHours: [
          { weekday: 0, openTime: "10:00:00", closeTime: "12:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["10:00", "11:00"]);
  });
});

describe("예약 가능 기간", () => {
  it("너무 먼 날짜는 열리지 않는다", () => {
    // 2026-09-03 + 63일 = 2026-11-05. 같은 목요일이라 운영시간은 있지만
    // maxAdvanceDays(60)를 넘어 닫혀야 한다.
    // (요일이 다른 날짜로 시험하면 운영시간이 없어서 통과해버려 의미가 없다)
    expect(weekdayOf("2026-11-05")).toBe(4);
    expect(timesOf(input({ date: "2026-11-05" }))).toEqual([]);
  });

  it("마지막 날은 열린다", () => {
    // 2026-09-03 + 60일 = 2026-11-02 (월요일)
    const times = timesOf(
      input({
        date: "2026-11-02",
        weeklyHours: [
          { weekday: 1, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });
});

describe("시간대 — 서버가 UTC로 돌아도 흔들리지 않는다", () => {
  it("KST 자정 직후에 접속해도 오늘 날짜가 밀리지 않는다", () => {
    // UTC로는 아직 9월 3일 16시지만 KST로는 9월 4일 새벽 1시.
    // today는 load.ts가 kstToday()로 넘기므로 9월 4일이 된다.
    const times = timesOf(
      input({
        date: "2026-09-05", // 토요일
        today: "2026-09-04",
        now: new Date("2026-09-03T16:00:00Z"),
        weeklyHours: [
          { weekday: 6, openTime: "10:00:00", closeTime: "12:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["10:00", "11:00"]);
  });

  it("월말을 넘어가는 예약도 정상 계산된다", () => {
    const times = timesOf(
      input({
        date: "2026-09-30", // 수요일
        weeklyHours: [
          { weekday: 3, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });

  it("해를 넘겨도 정상 계산된다", () => {
    const times = timesOf(
      input({
        date: "2027-01-01", // 금요일
        today: "2026-12-20",
        now: kstToInstant("2026-12-20", "09:00"),
        weeklyHours: [
          { weekday: 5, openTime: "18:00:00", closeTime: "20:00:00" },
        ],
      }),
    );
    expect(times).toEqual(["18:00", "19:00"]);
  });
});

describe("슬롯 간격 설정", () => {
  it("30분 간격으로 바꾸면 후보가 촘촘해진다", () => {
    const times = timesOf(
      input({
        settings: { slotIntervalMin: 30, minLeadDays: 1, maxAdvanceDays: 60 },
      }),
    );
    expect(times).toEqual(["18:00", "18:30", "19:00", "19:30", "20:00"]);
  });
});
