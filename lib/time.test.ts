import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  diffDays,
  kstDateString,
  kstMonthString,
  kstParts,
  kstTimeString,
  kstToday,
  kstToInstant,
  monthGridDates,
  weekdayOf,
} from "./time";

describe("KST 변환", () => {
  it("UTC 시점을 KST 달력 값으로 바꾼다 (UTC+9)", () => {
    expect(kstParts(new Date("2026-09-03T05:00:00Z"))).toEqual({
      year: 2026,
      month: 9,
      day: 3,
      hour: 14,
      minute: 0,
    });
  });

  it("KST 자정 직전은 아직 같은 날이다", () => {
    // 14:59:59Z = KST 23:59:59
    expect(kstDateString(new Date("2026-09-03T14:59:59Z"))).toBe("2026-09-03");
  });

  it("KST 자정을 넘기면 다음 날로 넘어간다", () => {
    // 15:00:00Z = KST 다음날 00:00
    expect(kstDateString(new Date("2026-09-03T15:00:00Z"))).toBe("2026-09-04");
  });

  it("자정을 24시가 아니라 00시로 표기한다", () => {
    expect(kstTimeString(new Date("2026-09-03T15:00:00Z"))).toBe("00:00");
  });

  it("정각 슬롯 시각을 그대로 돌려준다", () => {
    expect(kstTimeString(new Date("2026-09-03T01:00:00Z"))).toBe("10:00");
  });
});

describe("달력 날짜 계산", () => {
  it("하루를 더한다", () => {
    expect(addDays("2026-09-03", 1)).toBe("2026-09-04");
  });

  it("월말을 넘어간다", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("연말을 넘어간다", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("윤년 2월을 넘어간다", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("과거로도 간다", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("날짜 차이를 센다", () => {
    expect(diffDays("2026-09-03", "2026-09-04")).toBe(1);
    expect(diffDays("2026-09-04", "2026-09-03")).toBe(-1);
    expect(diffDays("2026-09-03", "2026-09-03")).toBe(0);
  });
});

describe("당일 예약 차단 규칙의 토대", () => {
  it("KST 오늘 + 1일이 가장 빠른 예약 가능일이 된다", () => {
    // 한국 시간 2026-09-03 23:00 (= 14:00Z) 에 접속해도 오늘은 9월 3일
    const now = new Date("2026-09-03T14:00:00Z");
    expect(kstToday(now)).toBe("2026-09-03");
    expect(addDays(kstToday(now), 1)).toBe("2026-09-04");
  });

  it("서버가 UTC로 날짜를 세면 하루가 어긋난다 (그래서 KST로 센다)", () => {
    const now = new Date("2026-09-03T16:00:00Z"); // KST로는 이미 9월 4일 새벽 1시
    expect(now.toISOString().slice(0, 10)).toBe("2026-09-03"); // UTC 기준
    expect(kstToday(now)).toBe("2026-09-04"); // 우리가 쓰는 기준
  });
});

describe("KST 벽시계 → 실제 시점", () => {
  it("KST 18:00은 UTC 09:00이다", () => {
    expect(kstToInstant("2026-09-10", "18:00").toISOString()).toBe(
      "2026-09-10T09:00:00.000Z",
    );
  });

  it("초 단위까지 있는 DB time 값도 받는다", () => {
    expect(kstToInstant("2026-09-10", "18:00:00").toISOString()).toBe(
      "2026-09-10T09:00:00.000Z",
    );
  });

  it("KST 자정은 전날 UTC 15:00이다", () => {
    expect(kstToInstant("2026-09-10", "00:00").toISOString()).toBe(
      "2026-09-09T15:00:00.000Z",
    );
  });

  it("Postgres가 허용하는 24:00은 다음 날 자정으로 이월된다", () => {
    expect(kstToInstant("2026-09-10", "24:00").toISOString()).toBe(
      kstToInstant("2026-09-11", "00:00").toISOString(),
    );
  });

  it("kstDateString/kstTimeString의 역방향이다", () => {
    for (const [date, time] of [
      ["2026-01-01", "00:00"],
      ["2026-06-30", "23:00"],
      ["2026-12-31", "12:30"],
      ["2028-02-29", "09:00"],
    ] as const) {
      const instant = kstToInstant(date, time);
      expect(kstDateString(instant)).toBe(date);
      expect(kstTimeString(instant)).toBe(time);
    }
  });
});

describe("요일 계산", () => {
  it("0=일요일 … 6=토요일", () => {
    expect(weekdayOf("2026-09-06")).toBe(0); // 일
    expect(weekdayOf("2026-09-07")).toBe(1); // 월
    expect(weekdayOf("2026-09-12")).toBe(6); // 토
  });

  it("UTC로 돌아도 KST 날짜의 요일이 흔들리지 않는다", () => {
    // 문자열 날짜 기준이므로 실행 환경 시간대와 무관하다
    expect(weekdayOf("2026-12-31")).toBe(4); // 목
    expect(weekdayOf("2027-01-01")).toBe(5); // 금
  });
});

describe("월 이동", () => {
  it("다음 달로 넘어간다", () => {
    expect(addMonths("2026-09", 1)).toBe("2026-10");
  });

  it("연말을 넘어간다", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("연초를 거슬러 넘어간다", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("여러 달을 한 번에 넘어간다", () => {
    expect(addMonths("2026-09", 5)).toBe("2027-02");
  });
});

describe("KST 월 문자열", () => {
  it("KST 자정을 넘기면 다음 달로 셀 수 있다 (월말 근처)", () => {
    // UTC 8/31 15:00 = KST 9/1 00:00
    expect(kstMonthString(new Date("2026-08-31T15:00:00Z"))).toBe("2026-09");
  });
});

describe("달력 그리드", () => {
  it("42칸을 만든다", () => {
    expect(monthGridDates("2026-09")).toHaveLength(42);
  });

  it("일요일부터 시작한다", () => {
    const grid = monthGridDates("2026-09");
    expect(weekdayOf(grid[0])).toBe(0);
  });

  it("그 달 1일을 포함한다", () => {
    const grid = monthGridDates("2026-09");
    expect(grid).toContain("2026-09-01");
  });

  it("이전 달 끝자락도 채운다 (2026-09-01은 화요일)", () => {
    const grid = monthGridDates("2026-09");
    expect(grid[0]).toBe("2026-08-30"); // 일요일
    expect(grid[1]).toBe("2026-08-31"); // 월요일
    expect(grid[2]).toBe("2026-09-01"); // 화요일
  });

  it("날짜가 연속으로 이어진다 (빠지거나 겹치지 않음)", () => {
    const grid = monthGridDates("2026-09");
    for (let i = 1; i < grid.length; i++) {
      expect(diffDays(grid[i - 1], grid[i])).toBe(1);
    }
  });

  it("연말 달도 정상 동작한다", () => {
    const grid = monthGridDates("2026-12");
    expect(grid).toContain("2026-12-31");
    expect(grid[grid.length - 1] >= "2027-01-01").toBe(true);
  });
});
