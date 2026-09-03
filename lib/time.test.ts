import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  kstDateString,
  kstParts,
  kstTimeString,
  kstToday,
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
