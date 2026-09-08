import { describe, expect, it } from "vitest";
import { calculateAge, parseBirthDate8 } from "./age";

describe("parseBirthDate8", () => {
  it("8자리 숫자를 YYYY-MM-DD로 바꾼다", () => {
    expect(parseBirthDate8("19990315")).toBe("1999-03-15");
  });

  it("자릿수가 안 맞으면 null", () => {
    expect(parseBirthDate8("199903")).toBeNull();
    expect(parseBirthDate8("199903155")).toBeNull();
    expect(parseBirthDate8("abcdefgh")).toBeNull();
  });

  it("존재하지 않는 날짜(2월 30일)는 null", () => {
    expect(parseBirthDate8("20240230")).toBeNull();
  });

  it("13월처럼 잘못된 월도 null", () => {
    expect(parseBirthDate8("20241301")).toBeNull();
  });

  it("윤년 2월 29일은 정상 처리한다", () => {
    expect(parseBirthDate8("20240229")).toBe("2024-02-29");
  });
});

describe("calculateAge", () => {
  it("생일이 지났으면 만나이 = 올해 - 출생연도", () => {
    const info = calculateAge("2000-01-01", "2026-06-15");
    expect(info.manAge).toBe(26);
    expect(info.koreanAge).toBe(27);
    expect(info.isMinor).toBe(false);
  });

  it("생일이 아직 안 지났으면 만나이는 1살 덜 셈", () => {
    const info = calculateAge("2000-12-31", "2026-06-15");
    expect(info.manAge).toBe(25);
    expect(info.koreanAge).toBe(27);
  });

  it("생일 당일은 이미 생일이 지난 것으로 친다", () => {
    const info = calculateAge("2000-06-15", "2026-06-15");
    expect(info.manAge).toBe(26);
  });

  it("만 19세 미만이면 미성년자", () => {
    expect(calculateAge("2010-01-01", "2026-06-15").isMinor).toBe(true);
    expect(calculateAge("2007-01-01", "2026-06-15").isMinor).toBe(false);
  });

  it("만 19세 생일 당일부터 성년", () => {
    expect(calculateAge("2007-06-15", "2026-06-15").isMinor).toBe(false);
    expect(calculateAge("2007-06-16", "2026-06-15").isMinor).toBe(true);
  });
});
